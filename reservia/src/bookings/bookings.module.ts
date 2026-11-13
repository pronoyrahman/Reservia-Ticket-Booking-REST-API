import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { Bookings } from './entities/bookings.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Bookings]), MailModule, AuditModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
