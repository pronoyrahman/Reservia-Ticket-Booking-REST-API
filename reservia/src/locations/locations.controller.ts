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
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';
import { LocationQueryDto } from './dtos/location-query.dto.js';
import { Locations } from './entities/locations.entity.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('create-location')
  @Roles(Role.Admin, Role.Organizer)
  async createLocation(
    @Body() location: CreateLocationDto,
  ): Promise<Locations> {
    return await this.locationsService.createLocation(location);
  }

  @Public()
  @Get()
  async getAllLocations(@Query() query: LocationQueryDto) {
    return await this.locationsService.getAllLocations(query);
  }

  @Public()
  @Get(':id')
  async getLocationById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Locations> {
    return await this.locationsService.getLocationById(id);
  }

  @Put('updateLocationFully/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateLocationFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: CreateLocationDto,
  ): Promise<string> {
    return await this.locationsService.replaceLocation(id, location);
  }

  @Patch('updateLocationPartially/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateLocationPartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: UpdateLocationDto,
  ): Promise<string> {
    return await this.locationsService.updateLocation(id, location);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Organizer)
  async deleteLocation(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return await this.locationsService.deleteLocation(id);
  }
}