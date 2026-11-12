import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { CreateResourceDto } from './dtos/create-resource.dto.js';
import { ReplaceResourceDto } from './dtos/replace-resource.dto.js';
import { UpdateResourceDto } from './dtos/update-resource.dto.js';
import { ResourceQueryDto } from './dtos/resource-query.dto.js';
import { Resources } from './entities/resources.entity.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('create-resource')
  @Roles(Role.Admin, Role.Organizer)
  async createResource(
    @Body() resource: CreateResourceDto,
  ): Promise<Resources> {
    return await this.resourcesService.createResource(resource);
  }

  @Public()
  @Get()
  async getAllResources(@Query() query: ResourceQueryDto) {
    return await this.resourcesService.getAllResources(query);
  }

  @Public()
  @Get(':id')
  async getResourceById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Resources> {
    return await this.resourcesService.getResourceById(id);
  }

  @Put('updateResourceFully/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateResourceFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: ReplaceResourceDto,
  ): Promise<string> {
    return await this.resourcesService.replaceResource(id, resource);
  }

  @Patch('updateResourcePartially/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateResourcePartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: UpdateResourceDto,
  ): Promise<string> {
    return await this.resourcesService.updateResource(id, resource);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Organizer)
  async deleteResource(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return await this.resourcesService.deleteResource(id);
  }
}