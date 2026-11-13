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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('create-resource')
  @Roles(Role.Admin, Role.Organizer)
  async createResource(
    @Body() resource: CreateResourceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Resources> {
    return await this.resourcesService.createResource(resource, user);
  }

  @Public()
  @Get()
  async getAllResources(@Query() query: ResourceQueryDto) {
    return await this.resourcesService.getAllResources(query);
  }

  @Get('my')
  @Roles(Role.Admin, Role.Organizer)
  async getMyResources(
    @Query() query: ResourceQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.resourcesService.getAllResources(query, user.id);
  }

  @Public()
  @Get(':id')
  async getResourceById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Resources> {
    return await this.resourcesService.getResourceById(id);
  }
    @Public()
  @Get(':id/seat-map')
  async getSeatMap(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload | null,
  ) {
    return await this.resourcesService.getSeatMap(id, user);
  }

  @Put('updateResourceFully/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateResourceFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: ReplaceResourceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<string> {
    return await this.resourcesService.replaceResource(id, resource, user);
  }

  @Patch('updateResourcePartially/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateResourcePartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() resource: UpdateResourceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<string> {
    return await this.resourcesService.updateResource(id, resource, user);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Organizer)
  async deleteResource(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<string> {
    return await this.resourcesService.deleteResource(id, user);
  }
}
