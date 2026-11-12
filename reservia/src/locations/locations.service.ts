import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Locations } from './entities/locations.entity.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Locations)
    private readonly locationsRepo: Repository<Locations>,
  ) {}

  async createLocation(location: CreateLocationDto): Promise<Locations> {
    const exists = await this.locationsRepo.findOneBy({ name: location.name });
    if (exists) {
      throw new BadRequestException(`Location '${location.name}' already exists`);
    }
    try {
      const locationEntity = this.locationsRepo.create(location);
      return await this.locationsRepo.save(locationEntity);
    } catch {
      throw new BadRequestException('Failed to create location');
    }
  }

  async getAllLocations(): Promise<Locations[]> {
    return await this.locationsRepo.find({
      order: { id: 'ASC' },
    });
  }

  async getLocationById(id: number): Promise<Locations | null> {
    return await this.locationsRepo.findOneBy({ id });
  }

  async replaceLocation(id: number, location: CreateLocationDto): Promise<string> {
    try {
      const res = (await this.locationsRepo.update(id, location)).affected;
      if (res && res > 0) {
        return `Location updated with id ${id}`;
      } else {
        return `Location with id ${id} not found`;
      }
    } catch {
      throw new BadRequestException('Failed to update location');
    }
  }

  async updateLocation(id: number, location: UpdateLocationDto): Promise<string> {
    try {
      const res = (await this.locationsRepo.update(id, location)).affected;
      if (res && res > 0) {
        return `Location updated with id ${id}`;
      } else {
        return `Location with id ${id} not found`;
      }
    } catch {
      throw new BadRequestException('Failed to update location');
    }
  }

  async deleteLocation(id: number): Promise<string> {
    const res = (await this.locationsRepo.delete(id)).affected;
    if (res && res > 0) {
      return `Location deleted with id ${id}`;
    } else {
      throw new BadRequestException('Location not found');
    }
  }
}