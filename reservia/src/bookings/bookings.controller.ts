import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevUserGuard } from '../common/dev-support/dev-user.guard.js';
import { DevUserId } from '../common/dev-support/dev-user.decorator.js';
import { BookingQueryDto } from './dtos/booking-query.dto.js';
import { CreateBookingDto } from './dtos/create-booking.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('bookings')
@UseGuards(DevUserGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @DevUserId() userId: number,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(userId, dto.seat_ids);
  }

  @Get()
  findMine(@DevUserId() userId: number, @Query() query: BookingQueryDto) {
    return this.bookingsService.findByUserId(userId, query);
  }

  @Get(':id')
  findOne(
    @DevUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findById(id, userId);
  }
}
