import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, randomUUID } from 'crypto';
import {
  DataSource,
  FindOptionsWhere,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Payments } from './entities/payments.entity.js';
import { CreatePaymentDto } from './dtos/create-payment.dto.js';
import { PaymentQueryDto } from './dtos/payment-query.dto.js';
import { Bookings } from '../bookings/entities/bookings.entity.js';
import { Tickets } from '../tickets/entities/tickets.entity.js';
import { SeatHolds } from '../holds/entities/seat-holds.entity.js';
import { BookingStatus } from '../common/enums/booking-status.enum.js';
import { HoldStatus } from '../common/enums/hold-status.enum.js';
import { PaymentStatus } from '../common/enums/payment-status.enum.js';
import { TicketStatus } from '../common/enums/ticket-status.enum.js';
import { Role } from '../common/enums/role.enum.js';
import { MailService } from '../mail/mail.service.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payments)
    private readonly paymentsRepo: Repository<Payments>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // README §6.1: payments + tickets + bookings + seat_holds in one transaction
  async createPayment(
    payment: CreatePaymentDto,
    user: JwtPayload,
  ): Promise<Payments> {
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    if (payment.simulateFailure && !isDevelopment) {
      throw new BadRequestException(
        'simulateFailure is only allowed when NODE_ENV=development',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. lock the booking (lock order: bookings -> seat_holds -> payments -> tickets)
      const booking = await queryRunner.manager
        .createQueryBuilder(Bookings, 'booking')
        .innerJoinAndSelect('booking.user', 'user')
        .innerJoinAndSelect('booking.resource', 'resource')
        .withDeleted()
        .where('booking.id = :id', { id: payment.bookingId })
        .setLock('pessimistic_write', undefined, ['booking'])
        .getOne();
      if (!booking) {
        throw new NotFoundException(
          `Booking with id ${payment.bookingId} not found`,
        );
      }

      // 2. BR-10: own booking, still pending
      if (booking.user.id !== user.id) {
        throw new ForbiddenException('You can only pay for your own bookings');
      }
      if (booking.status !== BookingStatus.Pending) {
        throw new ConflictException(
          `Booking with id ${booking.id} is ${booking.status}; only a pending booking can be paid`,
        );
      }

      // 3. lock the booking's holds
      const holds = await queryRunner.manager
        .createQueryBuilder(SeatHolds, 'hold')
        .innerJoinAndSelect('hold.seat', 'seat')
        .where('hold.bookingId = :id', { id: booking.id })
        .orderBy('hold.id', 'ASC')
        .setLock('pessimistic_write', undefined, ['hold'])
        .getMany();

      // BR-08: an expired hold expires the booking; commit that, then 409
      const now = new Date();
      const hasExpiredHold =
        holds.length === 0 ||
        holds.some(
          (hold) =>
            hold.status !== HoldStatus.Active ||
            new Date(hold.expiresAt) <= now,
        );
      if (hasExpiredHold) {
        await queryRunner.manager.update(Bookings, booking.id, {
          status: BookingStatus.Expired,
        });
        await queryRunner.manager.update(
          SeatHolds,
          { bookingId: booking.id, status: HoldStatus.Active },
          { status: HoldStatus.Expired },
        );
        await queryRunner.commitTransaction();
        throw new ConflictException(
          `A hold of booking ${booking.id} has expired; the booking is now expired and nothing was charged`,
        );
      }

      // BR-13: mock gateway failure -> failed payment row, booking stays pending
      if (payment.simulateFailure) {
        const failedPayment = queryRunner.manager.create(Payments, {
          booking: { id: booking.id },
          amount: booking.totalAmount,
          paymentMethod: payment.paymentMethod,
          transactionId: null,
          status: PaymentStatus.Failed,
          paidAt: null,
        });
        const savedFailed = await queryRunner.manager.save(failedPayment);
        await queryRunner.commitTransaction();
        return await this.findPayment(savedFailed.id);
      }

      // 4. the payment, completed by the mock gateway
      const newPayment = queryRunner.manager.create(Payments, {
        booking: { id: booking.id },
        amount: booking.totalAmount,
        paymentMethod: payment.paymentMethod,
        transactionId: `MOCK-${randomUUID()}`,
        status: PaymentStatus.Completed,
        paidAt: now,
      });
      const savedPayment = await queryRunner.manager.save(newPayment);

      // 5. one ticket per seat, at the price fixed in the booking
      const priceInCents = Math.round(
        (Number(booking.totalAmount) * 100) / holds.length,
      );
      const tickets = holds.map((hold) =>
        queryRunner.manager.create(Tickets, {
          booking: { id: booking.id },
          seat: { id: hold.seat.id },
          ticketNumber: this.newTicketNumber(),
          price: priceInCents / 100,
          status: TicketStatus.Issued,
        }),
      );
      await queryRunner.manager.save(tickets);

      // rollback demo (README §6.1): fail after the ticket insert
      if (
        isDevelopment &&
        String(this.configService.get('DEMO_FAIL_AFTER_TICKET_INSERT')) ===
          'true'
      ) {
        throw new InternalServerErrorException(
          'DEMO_FAIL_AFTER_TICKET_INSERT is on: the payment failed after the ticket insert and everything was rolled back',
        );
      }

      // 6. booking confirmed, holds completed
      await queryRunner.manager.update(Bookings, booking.id, {
        status: BookingStatus.Confirmed,
      });
      await queryRunner.manager.update(
        SeatHolds,
        { bookingId: booking.id, status: HoldStatus.Active },
        { status: HoldStatus.Completed },
      );

      // 7. commit
      await queryRunner.commitTransaction();

      // email only after a successful commit
      await this.mailService.sendBookingConfirmation({
        to: booking.user.email,
        name: booking.user.name,
        bookingId: booking.id,
        resourceName: booking.resource.name,
        startsAt: booking.resource.startsAt,
        amount: booking.totalAmount,
        ticketNumbers: tickets.map((ticket) => ticket.ticketNumber),
      });

      return await this.findPayment(savedPayment.id);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'A seat of this booking already has a valid ticket',
        );
      }
      throw new BadRequestException('Failed to create payment');
    } finally {
      await queryRunner.release();
    }
  }

  async getAllPayments(query: PaymentQueryDto): Promise<{
    data: Payments[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Payments> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.paymentsRepo.findAndCount({
      where: where,
      relations: { booking: { user: true } },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPaymentById(id: number, user: JwtPayload): Promise<Payments> {
    const payment = await this.findPayment(id);
    if (user.role !== Role.Admin && payment.booking.user.id !== user.id) {
      throw new ForbiddenException('You can only view your own payments');
    }
    return payment;
  }

  private async findPayment(id: number): Promise<Payments> {
    const payment = await this.paymentsRepo.findOne({
      where: { id: id },
      relations: {
        booking: { user: true, resource: true, tickets: { seat: true } },
      },
      withDeleted: true,
    });
    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }
    return payment;
  }

  // e.g. RSV-7K3Q-9XPA (no 0/O/1/I to avoid misreading at the gate)
  private newTicketNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[randomInt(chars.length)];
    }
    return `RSV-${code.slice(0, 4)}-${code.slice(4)}`;
  }
}
