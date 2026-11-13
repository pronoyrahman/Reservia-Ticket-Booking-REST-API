import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Seats } from './entities/seats.entity.js';
import { Resources } from '../resources/entities/resources.entity.js';
import { CreateSeatDto } from './dtos/create-seat.dto.js';
import { ReplaceSeatDto } from './dtos/replace-seat.dto.js';
import { UpdateSeatDto } from './dtos/update-seat.dto.js';
import { SeatQueryDto } from './dtos/seat-query.dto.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { Role } from '../common/enums/role.enum.js';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seats)
    private readonly seatsRepo: Repository<Seats>,
    private readonly dataSource: DataSource,
  ) {}

  async createSeat(seat: CreateSeatDto, user: JwtPayload): Promise<Seats> {
    await this.checkResourceOwner(seat.resourceId, user);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const resource = await queryRunner.manager.findOne(Resources, {
        where: { id: seat.resourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resource) {
        throw new NotFoundException(
          `Resource with id ${seat.resourceId} not found`,
        );
      }
      if (resource.capacity >= 260) {
        throw new ConflictException('A resource can have at most 260 seats');
      }

      const seatNumber = `${seat.rowLetter}${seat.columnNumber}`;
      const exists = await queryRunner.manager.findOneBy(Seats, {
        resource: { id: resource.id },
        seatNumber: seatNumber,
      });
      if (exists) {
        throw new ConflictException(
          `Seat ${seatNumber} already exists in resource ${resource.id}`,
        );
      }

      const seatEntity = queryRunner.manager.create(Seats, {
        resource: resource,
        seatNumber: seatNumber,
        rowLetter: seat.rowLetter,
        columnNumber: seat.columnNumber,
        status: seat.status,
        isAccessible: seat.isAccessible,
      });
      const savedSeat = await queryRunner.manager.save(seatEntity);
      await queryRunner.manager.update(Resources, resource.id, {
        capacity: resource.capacity + 1,
      });

      await queryRunner.commitTransaction();
      return savedSeat;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to create seat');
    } finally {
      await queryRunner.release();
    }
  }

  async getAllSeats(query: SeatQueryDto): Promise<{
    data: Seats[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Seats> = {};
    if (query.resourceId) {
      where.resource = { id: query.resourceId };
    }
    if (query.status) {
      where.status = query.status;
    }

    const [seats, total] = await this.seatsRepo.findAndCount({
      where: where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: seats,
      meta: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSeatById(id: number): Promise<Seats> {
    const seat = await this.seatsRepo.findOne({
      where: { id: id },
      relations: { resource: true },
    });
    if (!seat) {
      throw new NotFoundException(`Seat with id ${id} not found`);
    }
    return seat;
  }

  async replaceSeat(
    id: number,
    seat: ReplaceSeatDto,
    user: JwtPayload,
  ): Promise<string> {
    const oldSeat = await this.getOwnedSeat(id, user);
    const seatNumber = `${seat.rowLetter}${seat.columnNumber}`;
    await this.checkDuplicate(oldSeat.resource.id, seatNumber, id);

    this.seatsRepo.merge(oldSeat, seat);
    oldSeat.seatNumber = seatNumber;
    await this.seatsRepo.save(oldSeat);
    return `Seat updated with id ${id}`;
  }

  async updateSeat(
    id: number,
    seat: UpdateSeatDto,
    user: JwtPayload,
  ): Promise<string> {
    if (Object.keys(seat).length === 0) {
      throw new BadRequestException('Nothing to update');
    }
    const oldSeat = await this.getOwnedSeat(id, user);
    const seatNumber = `${seat.rowLetter ?? oldSeat.rowLetter}${
      seat.columnNumber ?? oldSeat.columnNumber
    }`;
    await this.checkDuplicate(oldSeat.resource.id, seatNumber, id);

    this.seatsRepo.merge(oldSeat, seat);
    oldSeat.seatNumber = seatNumber;
    await this.seatsRepo.save(oldSeat);
    return `Seat updated with id ${id}`;
  }

  async deleteSeat(id: number, user: JwtPayload): Promise<string> {
    const seat = await this.getOwnedSeat(id, user);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const resource = await queryRunner.manager.findOne(Resources, {
        where: { id: seat.resource.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resource) {
        throw new NotFoundException(
          `Resource with id ${seat.resource.id} not found`,
        );
      }
      if (resource.capacity <= 1) {
        throw new ConflictException('A resource must keep at least one seat');
      }
      // BR-15: later also return 409 if this seat was ever held or sold

      await queryRunner.manager.delete(Seats, id);
      await queryRunner.manager.update(Resources, resource.id, {
        capacity: resource.capacity - 1,
      });

      await queryRunner.commitTransaction();
      return `Seat deleted with id ${id}`;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete seat');
    } finally {
      await queryRunner.release();
    }
  }

  private async checkResourceOwner(
    resourceId: number,
    user: JwtPayload,
  ): Promise<void> {
    const resource = await this.dataSource.getRepository(Resources).findOne({
      where: { id: resourceId },
      relations: { organizer: true },
    });
    if (!resource) {
      throw new NotFoundException(`Resource with id ${resourceId} not found`);
    }
    if (user.role !== Role.Admin && resource.organizer.id !== user.id) {
      throw new ForbiddenException(
        'You can only change seats of your own resources',
      );
    }
  }

  private async getOwnedSeat(id: number, user: JwtPayload): Promise<Seats> {
    const seat = await this.getSeatById(id);
    await this.checkResourceOwner(seat.resource.id, user);
    return seat;
  }

  private async checkDuplicate(
    resourceId: number,
    seatNumber: string,
    id?: number,
  ): Promise<void> {
    const exists = await this.seatsRepo.findOneBy({
      resource: { id: resourceId },
      seatNumber: seatNumber,
    });
    if (exists && exists.id !== id) {
      throw new ConflictException(
        `Seat ${seatNumber} already exists in resource ${resourceId}`,
      );
    }
  }
}