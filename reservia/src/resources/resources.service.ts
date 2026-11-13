import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  MoreThan,
  DataSource,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Resources } from './entities/resources.entity.js';
import { Seats } from '../seats/entities/seats.entity.js';
import type { Locations } from '../locations/entities/locations.entity.js';
import { CreateResourceDto } from './dtos/create-resource.dto.js';
import { ReplaceResourceDto } from './dtos/replace-resource.dto.js';
import { UpdateResourceDto } from './dtos/update-resource.dto.js';
import { ResourceQueryDto } from './dtos/resource-query.dto.js';
import { LocationsService } from '../locations/locations.service.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { Role } from '../common/enums/role.enum.js';
  import { SeatHolds } from '../holds/entities/seat-holds.entity.js';
  import { HoldStatus } from '../common/enums/hold-status.enum.js';
  import { SeatStatus } from '../common/enums/seat-status.enum.js';
import { SeatAvailability } from '../common/enums/seat-availability.enum.js';

export type SeatMapSeat = {
  id: number;
  seatNumber: string;
  rowLetter: string;
  columnNumber: number;
  isAccessible: boolean;
  availability: SeatAvailability;
  holdId?: number;
  remainingSeconds?: number;
};

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resources)
    private readonly resourcesRepo: Repository<Resources>,
    private readonly locationsService: LocationsService,
    private readonly dataSource: DataSource,
  ) {}

  async createResource(
    resource: CreateResourceDto,
    user: JwtPayload,
  ): Promise<Resources> {
    if (resource.startsAt <= new Date()) {
      throw new BadRequestException('startsAt must be in the future');
    }
    this.checkDates(resource.startsAt, resource.endsAt);

    const seatsPerRow = resource.seatsPerRow ?? 10;
    if (Math.ceil(resource.capacity / seatsPerRow) > 26) {
      throw new BadRequestException(
        'capacity / seatsPerRow needs more than 26 rows (A-Z)',
      );
    }

    const location = await this.locationsService.getLocationById(
      resource.locationId,
    );
    if (!location.isActive) {
      throw new ConflictException(
        `Location with id ${location.id} is not active`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const resourceEntity = queryRunner.manager.create(Resources, {
        ...resource,
        seatsPerRow: seatsPerRow,
        location: location,
        organizer: { id: user.id },
      });
      const savedResource = await queryRunner.manager.save(resourceEntity);

      const seats: Seats[] = [];
      for (let i = 0; i < resource.capacity; i++) {
        const rowLetter = String.fromCharCode(65 + Math.floor(i / seatsPerRow));
        const columnNumber = (i % seatsPerRow) + 1;
        seats.push(
          queryRunner.manager.create(Seats, {
            resource: savedResource,
            seatNumber: `${rowLetter}${columnNumber}`,
            rowLetter: rowLetter,
            columnNumber: columnNumber,
          }),
        );
      }
      await queryRunner.manager.save(seats);

      await queryRunner.commitTransaction();
      return savedResource;
    } catch {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Failed to create resource with seats');
    } finally {
      await queryRunner.release();
    }
  }

  async getAllResources(
    query: ResourceQueryDto,
    organizerId?: number,
  ): Promise<{
    data: Resources[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Resources> = {};
    if (organizerId) {
      where.organizer = { id: organizerId };
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }
    if (query.from && query.to) {
      where.startsAt = Between(query.from, query.to);
    } else if (query.from) {
      where.startsAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.startsAt = LessThanOrEqual(query.to);
    }
    if (query.locationId || query.city) {
      const locationWhere: FindOptionsWhere<Locations> = {};
      if (query.locationId) {
        locationWhere.id = query.locationId;
      }
      if (query.city) {
        locationWhere.city = ILike(query.city);
      }
      where.location = locationWhere;
    }

    const [resources, total] = await this.resourcesRepo.findAndCount({
      where: where,
      relations: { location: true },
      order: { startsAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: resources,
      meta: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getResourceById(id: number): Promise<Resources> {
    const resource = await this.resourcesRepo.findOne({
      where: { id: id },
      relations: { location: true },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    return resource;
  }

  async replaceResource(
    id: number,
    resource: ReplaceResourceDto,
    user: JwtPayload,
  ): Promise<string> {
    const oldResource = await this.getOwnedResource(id, user);
    this.checkDates(resource.startsAt, resource.endsAt);
    this.checkNewStart(oldResource, resource.startsAt);
    const location = await this.getLocationForUpdate(
      oldResource,
      resource.locationId,
    );

    this.resourcesRepo.merge(oldResource, resource);
    oldResource.location = location;
    await this.resourcesRepo.save(oldResource);
    return `Resource updated with id ${id}`;
  }
    async getSeatMap(
    id: number,
    user?: JwtPayload | null,
  ): Promise<{
    resource: {
      id: number;
      name: string;
      startsAt: Date;
      pricePerTicket: number;
      capacity: number;
      location: string;
    };
    summary: {
      available: number;
      heldByYou: number;
      unavailable: number;
      blocked: number;
    };
    seats: SeatMapSeat[];
  }> {
    const resource = await this.getResourceById(id);

    const seats = await this.dataSource.getRepository(Seats).find({
      where: { resource: { id: id } },
      order: { rowLetter: 'ASC', columnNumber: 'ASC' },
    });

    // BR-03: only active holds that have not expired keep a seat
    const activeHolds = await this.dataSource.getRepository(SeatHolds).find({
      where: {
        seat: { resource: { id: id } },
        status: HoldStatus.Active,
        expiresAt: MoreThan(new Date()),
      },
      relations: { seat: true, user: true },
    });
    const holdBySeatId = new Map<number, SeatHolds>();
    for (const hold of activeHolds) {
      holdBySeatId.set(hold.seat.id, hold);
    }
    // TODO after Rafsan's tickets: seats with an issued/used ticket are UNAVAILABLE

    const summary = { available: 0, heldByYou: 0, unavailable: 0, blocked: 0 };
    const seatMap: SeatMapSeat[] = seats.map((seat) => {
      const base = {
        id: seat.id,
        seatNumber: seat.seatNumber,
        rowLetter: seat.rowLetter,
        columnNumber: seat.columnNumber,
        isAccessible: seat.isAccessible,
      };

      if (seat.status === SeatStatus.Blocked) {
        summary.blocked++;
        return { ...base, availability: SeatAvailability.Blocked };
      }

      const hold = holdBySeatId.get(seat.id);
      if (hold && user && hold.user.id === user.id) {
        summary.heldByYou++;
        return {
          ...base,
          availability: SeatAvailability.HeldByYou,
          holdId: hold.id,
          remainingSeconds: Math.max(
            0,
            Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000),
          ),
        };
      }
      if (hold) {
        summary.unavailable++;
        return { ...base, availability: SeatAvailability.Unavailable };
      }

      summary.available++;
      return { ...base, availability: SeatAvailability.Available };
    });

    return {
      resource: {
        id: resource.id,
        name: resource.name,
        startsAt: resource.startsAt,
        pricePerTicket: resource.pricePerTicket,
        capacity: resource.capacity,
        location: resource.location.name,
      },
      summary: summary,
      seats: seatMap,
    };
  }

  async updateResource(
    id: number,
    resource: UpdateResourceDto,
    user: JwtPayload,
  ): Promise<string> {
    if (Object.keys(resource).length === 0) {
      throw new BadRequestException('Nothing to update');
    }
    const oldResource = await this.getOwnedResource(id, user);
    this.checkDates(
      resource.startsAt ?? oldResource.startsAt,
      resource.endsAt ?? oldResource.endsAt,
    );
    this.checkNewStart(oldResource, resource.startsAt);
    const location = await this.getLocationForUpdate(
      oldResource,
      resource.locationId,
    );

    this.resourcesRepo.merge(oldResource, resource);
    oldResource.location = location;
    await this.resourcesRepo.save(oldResource);
    return `Resource updated with id ${id}`;
  }

    async deleteResource(id: number, user: JwtPayload): Promise<string> {
    await this.getOwnedResource(id, user);

    // BR-15: a resource with active holds cannot be deleted (bookings check after Rafsan's table)
    const activeHolds = await this.dataSource.getRepository(SeatHolds).count({
      where: {
        seat: { resource: { id: id } },
        status: HoldStatus.Active,
        expiresAt: MoreThan(new Date()),
      },
    });
    if (activeHolds > 0) {
      throw new ConflictException(
        `Resource with id ${id} has ${activeHolds} active hold(s) and cannot be deleted; set isAvailable to false instead`,
      );
    }

    const result = (await this.resourcesRepo.softDelete(id)).affected;
    if (result != null && result > 0) {
      return `Resource deleted with id ${id}`;
    } else {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
  }

  private async getOwnedResource(
    id: number,
    user: JwtPayload,
  ): Promise<Resources> {
    const resource = await this.resourcesRepo.findOne({
      where: { id: id },
      relations: { location: true, organizer: true },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
    if (user.role !== Role.Admin && resource.organizer.id !== user.id) {
      throw new ForbiddenException('You can only change your own resources');
    }
    return resource;
  }

  private checkNewStart(oldResource: Resources, startsAt?: Date): void {
    if (!startsAt) {
      return;
    }
    const changed =
      startsAt.getTime() !== new Date(oldResource.startsAt).getTime();
    if (changed && startsAt <= new Date()) {
      throw new BadRequestException('startsAt must be in the future');
    }
  }

  private async getLocationForUpdate(
    oldResource: Resources,
    locationId?: number,
  ): Promise<Locations> {
    if (!locationId || locationId === oldResource.location.id) {
      return oldResource.location;
    }
    const location = await this.locationsService.getLocationById(locationId);
    if (!location.isActive) {
      throw new ConflictException(
        `Location with id ${location.id} is not active`,
      );
    }
    return location;
  }

  private checkDates(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }
}
