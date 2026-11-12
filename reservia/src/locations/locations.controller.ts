import {Controller, Delete,Get,Param,Body,ParseIntPipe,Patch,Post,Put,Query,} from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dtos/create-location.dto.js';
import { UpdateLocationDto } from './dtos/update-location.dto.js';
import { LocationQueryDto } from './dtos/location-query.dto.js';
import { Locations } from './entities/locations.entity.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('create-location')
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
  async updateLocationFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: CreateLocationDto,
  ): Promise<string> {
    return await this.locationsService.replaceLocation(id, location);
  }

  @Patch('updateLocationPartially/:id')
  async updateLocationPartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() location: UpdateLocationDto,
  ): Promise<string> {
    return await this.locationsService.updateLocation(id, location);
  }

  @Delete(':id')
  async deleteLocation(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<string> {
    return await this.locationsService.deleteLocation(id);
  }
}