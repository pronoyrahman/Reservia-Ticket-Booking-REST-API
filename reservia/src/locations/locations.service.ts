import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Locations } from './entities/locations.entity.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';
import { LocationQueryDto } from './dtos/location-query.dto.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Locations)
    private readonly locationsRepo: Repository<Locations>,
  ) {}

  async createLocation(location: CreateLocationDto): Promise<Locations> {
    await this.checkDuplicate(location.name, location.address);
    try {
      const locationEntity = this.locationsRepo.create(location);
      return await this.locationsRepo.save(locationEntity);
    } catch {
      throw new BadRequestException('Failed to create location');
    }
  }

  async getAllLocations(query: LocationQueryDto): Promise<{
    data: Locations[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [locations, total] = await this.locationsRepo.findAndCount({
      where: query.city ? { city: ILike(query.city) } : {},
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
  ): Promise<string> {
    await this.getLocationById(id);
    await this.checkDuplicate(location.name, location.address, id);
    await this.locationsRepo.update(id, location);
    return `Location updated with id ${id}`;
  }

  async updateLocation(
    id: number,
    location: UpdateLocationDto,
  ): Promise<string> {
    if (Object.keys(location).length === 0) {
      throw new BadRequestException('Nothing to update');
    }
    const oldLocation = await this.getLocationById(id);
    await this.checkDuplicate(
      location.name ?? oldLocation.name,
      location.address ?? oldLocation.address,
      id,
    );
    await this.locationsRepo.update(id, location);
    return `Location updated with id ${id}`;
  }

  async deleteLocation(id: number): Promise<string> {
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
