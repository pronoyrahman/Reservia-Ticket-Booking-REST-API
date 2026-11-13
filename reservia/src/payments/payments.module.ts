import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevUserGuard } from '../common/dev-support/dev-user.guard.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Payment } from './entities/payment.entity.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Booking])],
  controllers: [PaymentsController],
  providers: [PaymentsService, DevUserGuard],
})
export class PaymentsModule {}
