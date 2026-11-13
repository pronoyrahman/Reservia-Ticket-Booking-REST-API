import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/entities/ticket.entity.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { Booking } from './entities/booking.entity.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Ticket]), TicketsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}