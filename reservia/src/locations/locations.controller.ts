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
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';
import { LocationQueryDto } from './dtos/location-query.dto.js';
import { Locations } from './entities/locations.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('create-location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async createLocation(
    @Body() location: CreateLocationDto,
  ): Promise<Locations> {
    return await this.locationsService.createLocation(location);
  }

  @Get()
  async getAllLocations(@Query() query: LocationQueryDto) {
    return await this.locationsService.getAllLocations(query);
  }

  @Get(':id')
  async getLocationById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Locations> {
    return await this.locationsService.getLocationById(id);
  }

  @Put('updateLocationFully/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateLocationFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: CreateLocationDto,
  ): Promise<string> {
    return await this.locationsService.replaceLocation(id, location);
  }

  @Patch('updateLocationPartially/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateLocationPartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: UpdateLocationDto,
  ): Promise<string> {
    return await this.locationsService.updateLocation(id, location);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteLocation(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return await this.locationsService.deleteLocation(id);
  }
}
