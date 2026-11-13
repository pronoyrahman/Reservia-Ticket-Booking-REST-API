import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Locations } from './entities/locations.entity.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';
import { LocationQueryDto } from './dtos/location-query.dto.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { Role } from '../common/enums/role.enum.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Locations)
    private readonly locationsRepo: Repository<Locations>,
  ) {}

  async createLocation(
    location: CreateLocationDto,
    user: JwtPayload,
  ): Promise<Locations> {
    await this.checkDuplicate(location.name, location.address);
    try {
      const locationEntity = this.locationsRepo.create({
        ...location,
        createdBy: { id: user.id },
      });
      return await this.locationsRepo.save(locationEntity);
    } catch {
      throw new BadRequestException('Failed to create location');
    }
  }

  async getAllLocations(
    query: LocationQueryDto,
    createdById?: number,
  ): Promise<{
    data: Locations[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Locations> = {};
    if (query.city) {
      where.city = ILike(query.city);
    }
    if (createdById) {
      where.createdBy = { id: createdById };
    }

    const [locations, total] = await this.locationsRepo.findAndCount({
      where: where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: locations,
      meta: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLocationById(id: number): Promise<Locations> {
    const location = await this.locationsRepo.findOneBy({ id });
    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }
    return location;
  }

  async replaceLocation(
    id: number,
    location: CreateLocationDto,
    user: JwtPayload,
  ): Promise<string> {
    await this.getOwnedLocation(id, user);
    await this.checkDuplicate(location.name, location.address, id);
    await this.locationsRepo.update(id, location);
    return `Location updated with id ${id}`;
  }

  async updateLocation(
    id: number,
    location: UpdateLocationDto,
    user: JwtPayload,
  ): Promise<string> {
    if (Object.keys(location).length === 0) {
      throw new BadRequestException('Nothing to update');
    }
    const oldLocation = await this.getOwnedLocation(id, user);
    await this.checkDuplicate(
      location.name ?? oldLocation.name,
      location.address ?? oldLocation.address,
      id,
    );
    await this.locationsRepo.update(id, location);
    return `Location updated with id ${id}`;
  }

  async deleteLocation(id: number, user: JwtPayload): Promise<string> {
    await this.getOwnedLocation(id, user);

    const location = await this.locationsRepo.findOne({
      where: { id: id },
      relations: { resources: true },
    });
    if (location && location.resources.length > 0) {
      throw new ConflictException(
        `Location with id ${id} is used by ${location.resources.length} resource(s) and cannot be deleted`,
      );
    }

    const result = (await this.locationsRepo.softDelete(id)).affected;
    if (result != null && result > 0) {
      return `Location deleted with id ${id}`;
    } else {
      throw new NotFoundException(`Location with id ${id} not found`);
    }
  }

  private async getOwnedLocation(
    id: number,
    user: JwtPayload,
  ): Promise<Locations> {
    const location = await this.locationsRepo.findOne({
      where: { id: id },
      relations: { createdBy: true },
    });
    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }
    if (user.role !== Role.Admin && location.createdBy.id !== user.id) {
      throw new ForbiddenException('You can only change your own locations');
    }
    return location;
  }

  private async checkDuplicate(
    name: string,
    address: string,
    id?: number,
  ): Promise<void> {
    const exists = await this.locationsRepo.findOne({
      where: {
        name: name,
        address: address,
      },
      withDeleted: true,
    });
    if (exists && exists.id !== id) {
      throw new ConflictException(
        `Location '${name}' already exists at this address`,
      );
    }
  }
}