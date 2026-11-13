import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatsController } from './seats.controller.js';
import { SeatsService } from './seats.service.js';
import { Seats } from './entities/seats.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Seats])],
  controllers: [SeatsController],
  providers: [SeatsService],
  exports: [SeatsService, TypeOrmModule],
})
export class SeatsModule {}