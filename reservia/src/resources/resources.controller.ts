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
  UseGuards,
} from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { CreateResourceDto } from './dtos/create-resource.dto.js';
import { ReplaceResourceDto } from './dtos/replace-resource.dto.js';
import { UpdateResourceDto } from './dtos/update-resource.dto.js';
import { ResourceQueryDto } from './dtos/resource-query.dto.js';
import { Resources } from './entities/resources.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('create-resource')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async createResource(
    @Body() resource: CreateResourceDto,
  ): Promise<Resources> {
    return await this.resourcesService.createResource(resource);
  }

  @Get()
  async getAllResources(@Query() query: ResourceQueryDto) {
    return await this.resourcesService.getAllResources(query);
  }

  @Get(':id')
  async getResourceById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Resources> {
    return await this.resourcesService.getResourceById(id);
  }

  @Put('updateResourceFully/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateResourceFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: ReplaceResourceDto,
  ): Promise<string> {
    return await this.resourcesService.replaceResource(id, resource);
  }

  @Patch('updateResourcePartially/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateResourcePartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: UpdateResourceDto,
  ): Promise<string> {
    return await this.resourcesService.updateResource(id, resource);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteResource(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return await this.resourcesService.deleteResource(id);
  }
}
