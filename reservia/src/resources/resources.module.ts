import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesController } from './resources.controller.js';
import { ResourcesService } from './resources.service.js';
import { Resources } from './entities/resources.entity.js';
import { LocationsModule } from '../locations/locations.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Resources]), LocationsModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}