import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Resources } from './entities/resources.entity.js';
import type { Locations } from '../locations/entities/locations.entity.js';
import { CreateResourceDto } from './dtos/create-resource.dto.js';
import { ReplaceResourceDto } from './dtos/replace-resource.dto.js';
import { UpdateResourceDto } from './dtos/update-resource.dto.js';
import { ResourceQueryDto } from './dtos/resource-query.dto.js';
import { LocationsService } from '../locations/locations.service.js';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resources)
    private readonly resourcesRepo: Repository<Resources>,
    private readonly locationsService: LocationsService,
  ) {}

  async createResource(resource: CreateResourceDto): Promise<Resources> {
    if (resource.startsAt <= new Date()) {
      throw new BadRequestException('startsAt must be in the future');
    }
    this.checkDates(resource.startsAt, resource.endsAt);

    const location = await this.locationsService.getLocationById(
      resource.locationId,
    );
    if (!location.isActive) {
      throw new ConflictException(
        `Location with id ${location.id} is not active`,
      );
    }

    try {
      const resourceEntity = this.resourcesRepo.create({
        ...resource,
        location: location,
      });
      return await this.resourcesRepo.save(resourceEntity);
    } catch {
      throw new BadRequestException('Failed to create resource');
    }
  }

  async getAllResources(query: ResourceQueryDto): Promise<{
    data: Resources[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Resources> = {};
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
  ): Promise<string> {
    const oldResource = await this.getResourceById(id);
    this.checkDates(resource.startsAt, resource.endsAt);
    const location = await this.locationsService.getLocationById(
      resource.locationId,
    );

    this.resourcesRepo.merge(oldResource, resource);
    oldResource.location = location;
    await this.resourcesRepo.save(oldResource);
    return `Resource updated with id ${id}`;
  }

  async updateResource(
    id: number,
    resource: UpdateResourceDto,
  ): Promise<string> {
    if (Object.keys(resource).length === 0) {
      throw new BadRequestException('Nothing to update');
    }
    const oldResource = await this.getResourceById(id);
    this.checkDates(
      resource.startsAt ?? oldResource.startsAt,
      resource.endsAt ?? oldResource.endsAt,
    );

    this.resourcesRepo.merge(oldResource, resource);
    if (resource.locationId) {
      oldResource.location = await this.locationsService.getLocationById(
        resource.locationId,
      );
    }
    await this.resourcesRepo.save(oldResource);
    return `Resource updated with id ${id}`;
  }

  async deleteResource(id: number): Promise<string> {
    const result = (await this.resourcesRepo.softDelete(id)).affected;
    if (result != null && result > 0) {
      return `Resource deleted with id ${id}`;
    } else {
      throw new NotFoundException(`Resource with id ${id} not found`);
    }
  }

  private checkDates(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }
}
