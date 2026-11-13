import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HoldsController } from './holds.controller.js';
import { HoldsService } from './holds.service.js';
import { SeatHolds } from './entities/seat-holds.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SeatHolds])],
  controllers: [HoldsController],
  providers: [HoldsService],
  exports: [HoldsService, TypeOrmModule],
})
export class HoldsModule {}