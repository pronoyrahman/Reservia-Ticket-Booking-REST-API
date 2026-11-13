import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Payment, PaymentStatus } from './entities/payment.entity.js';

type LockedPayment = {
  id: number;
  booking_id: number;
  amount: string;
  status: PaymentStatus;
  created_at: Date;
};

function cents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async initiate(bookingId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.getRepository(Booking).findOne({
        where: { id: bookingId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status !== 'pending') {
        throw new ConflictException('Payment can only be initiated for a pending booking');
      }

      const paymentRepository = manager.getRepository(Payment);
      const existing = await paymentRepository.findOne({ where: { bookingId } });
      if (existing?.status === 'pending') {
        return this.paymentResponse(existing);
      }
      if (existing) {
        throw new ConflictException('A payment has already been processed for this booking');
      }

      const payment = await paymentRepository.save(
        paymentRepository.create({
          bookingId,
          amount: booking.totalPrice,
          status: 'pending',
          referenceId: randomUUID(),
        }),
      );
      return this.paymentResponse(payment);
    });
  }

  async findById(id: number, userId: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const booking = await this.bookingsRepository.findOne({
      where: { id: payment.bookingId, userId },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('Payment not found');
    return this.paymentResponse(payment);
  }

  async handleMockWebhook(paymentId: number, status: 'completed' | 'failed', amount: number) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, booking_id, amount, status, created_at
         FROM payments WHERE id = $1 FOR UPDATE`,
        [paymentId],
      )) as LockedPayment[];
      const payment = rows[0];
      if (!payment) throw new NotFoundException('Payment not found');
      if (cents(payment.amount) !== cents(amount)) {
        throw new ConflictException('Webhook amount does not match the payment amount');
      }

      if (payment.status !== 'pending') {
        if (payment.status !== status) {
          throw new ConflictException('This payment already has a different final status');
        }
        return { payment_id: payment.id, booking_id: payment.booking_id, status: payment.status };
      }

      const graceMinutes = Number(process.env.PAYMENT_GRACE_MINUTES ?? 5);
      const isLate = Date.now() - new Date(payment.created_at).getTime() > graceMinutes * 60_000;
      const finalStatus: PaymentStatus = isLate ? 'failed' : status;

      await manager.query('UPDATE payments SET status = $1 WHERE id = $2', [
        finalStatus,
        payment.id,
      ]);

      if (finalStatus === 'completed') {
        await manager.query("UPDATE bookings SET status = 'confirmed' WHERE id = $1", [
          payment.booking_id,
        ]);
        await manager.query("UPDATE tickets SET status = 'valid' WHERE booking_id = $1", [
          payment.booking_id,
        ]);
        await manager.query(
          `UPDATE seats SET status = 'booked'
           WHERE id IN (SELECT seat_id FROM tickets WHERE booking_id = $1)`,
          [payment.booking_id],
        );
      } else {
        await manager.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [
          payment.booking_id,
        ]);
        await manager.query("UPDATE tickets SET status = 'cancelled' WHERE booking_id = $1", [
          payment.booking_id,
        ]);
        await manager.query(
          `UPDATE seats SET status = 'available'
           WHERE id IN (SELECT seat_id FROM tickets WHERE booking_id = $1)`,
          [payment.booking_id],
        );
        await manager.query(
          `UPDATE seat_holds SET status = 'expired'
           WHERE seat_id IN (SELECT seat_id FROM tickets WHERE booking_id = $1)
             AND status = 'completed'`,
          [payment.booking_id],
        );
      }

      return {
        payment_id: payment.id,
        booking_id: payment.booking_id,
        status: finalStatus,
        ...(isLate ? { message: 'The payment grace period expired; the booking was cancelled' } : {}),
      };
    });
  }

  private paymentResponse(payment: Payment) {
    return {
      payment_id: payment.id,
      booking_id: payment.bookingId,
      amount: payment.amount,
      status: payment.status,
      reference_id: payment.referenceId,
      created_at: payment.createdAt,
    };
  }
}
