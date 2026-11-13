import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { BookingQueryDto } from './dtos/booking-query.dto.js';
import { CreateBookingDto } from './dtos/create-booking.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.Customer)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto.seat_ids);
  }

  @Get()
  @Roles(Role.Customer)
  findMine(@CurrentUser() user: JwtPayload, @Query() query: BookingQueryDto) {
    return this.bookingsService.findByUserId(user.id, query);
  }

  @Get(':id')
  @Roles(Role.Customer)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findById(id, user.id);
  }
}