import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import type { BookingDetails } from './bookings.service.js';
import { CreateBookingDto } from './dtos/create-booking.dto.js';
import { BookingQueryDto } from './dtos/booking-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { SkipAudit } from '../audit/skip-audit.decorator.js';
import { AuditInfo } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit-context.decorator.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('create-booking')
  @Roles(Role.Customer)
  async createBooking(
    @Body() booking: CreateBookingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookingDetails> {
    return await this.bookingsService.createBooking(booking, user);
  }

  @Get('me')
  @Roles(Role.Customer)
  async getMyBookings(
    @Query() query: BookingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.bookingsService.getMyBookings(query, user);
  }

  @Get()
  @Roles(Role.Admin, Role.Organizer)
  async getAllBookings(
    @Query() query: BookingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.bookingsService.getAllBookings(query, user);
  }

  @Get(':id')
  @Roles(Role.Customer, Role.Organizer, Role.Admin)
  async getBookingById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<BookingDetails> {
    return await this.bookingsService.getBookingById(id, user);
  }

  @Patch(':id/cancel')
  @Roles(Role.Customer, Role.Admin)
  @SkipAudit()
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @AuditInfo() context: AuditContext,
  ): Promise<string> {
    return await this.bookingsService.cancelBooking(id, user, context);
  }

  @Delete(':id')
  @Roles(Role.Customer, Role.Admin)
  async deleteBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<string> {
    return await this.bookingsService.deleteBooking(id, user);
  }
}
