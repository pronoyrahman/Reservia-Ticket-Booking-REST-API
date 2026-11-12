import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';
import { Locations } from './entities/locations.entity.js';
@Module({
  imports: [TypeOrmModule.forFeature([Locations])],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
