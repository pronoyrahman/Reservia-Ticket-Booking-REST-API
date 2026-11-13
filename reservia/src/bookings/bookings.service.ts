import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  In,
  MoreThan,
  QueryRunner,
  Repository,
} from 'typeorm';
import { Bookings } from './entities/bookings.entity.js';
import { CreateBookingDto } from './dtos/create-booking.dto.js';
import { BookingQueryDto } from './dtos/booking-query.dto.js';
import { SeatHolds } from '../holds/entities/seat-holds.entity.js';
import { Payments } from '../payments/entities/payments.entity.js';
import { Tickets } from '../tickets/entities/tickets.entity.js';
import type { Resources } from '../resources/entities/resources.entity.js';
import { BookingStatus } from '../common/enums/booking-status.enum.js';
import { HoldStatus } from '../common/enums/hold-status.enum.js';
import { PaymentStatus } from '../common/enums/payment-status.enum.js';
import { TicketStatus } from '../common/enums/ticket-status.enum.js';
import { AuditAction } from '../common/enums/audit-action.enum.js';
import { Role } from '../common/enums/role.enum.js';
import { MailService } from '../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuditContext } from '../audit/audit-context.decorator.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

// a booking with the holds it groups (seat_holds has no relation to bookings)
export type BookingDetails = Bookings & { holds: SeatHolds[] };

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Bookings)
    private readonly bookingsRepo: Repository<Bookings>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  // T4: seat_holds + bookings in one transaction
  async createBooking(
    booking: CreateBookingDto,
    user: JwtPayload,
  ): Promise<BookingDetails> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. lock the listed holds
      const holds = await queryRunner.manager
        .createQueryBuilder(SeatHolds, 'hold')
        .innerJoinAndSelect('hold.user', 'user')
        .innerJoinAndSelect('hold.seat', 'seat')
        .innerJoinAndSelect('seat.resource', 'resource')
        .withDeleted()
        .where('hold.id IN (:...holdIds)', { holdIds: booking.holdIds })
        .orderBy('hold.id', 'ASC')
        .setLock('pessimistic_write', undefined, ['hold'])
        .getMany();

      for (const holdId of booking.holdIds) {
        if (!holds.some((hold) => hold.id === holdId)) {
          throw new NotFoundException(`Hold with id ${holdId} not found`);
        }
      }

      // 2. BR-06: own, active, unexpired, not linked, one resource
      for (const hold of holds) {
        if (hold.user.id !== user.id) {
          throw new ForbiddenException(
            `Hold with id ${hold.id} does not belong to you`,
          );
        }
      }
      const now = new Date();
      for (const hold of holds) {
        if (hold.bookingId) {
          throw new ConflictException(
            `Hold with id ${hold.id} already belongs to booking ${hold.bookingId}`,
          );
        }
        if (
          hold.status !== HoldStatus.Active ||
          new Date(hold.expiresAt) <= now
        ) {
          throw new ConflictException(
            `Hold with id ${hold.id} is not active or has expired`,
          );
        }
      }
      const resource = holds[0].seat.resource;
      if (holds.some((hold) => hold.seat.resource.id !== resource.id)) {
        throw new ConflictException(
          'All holds in one booking must be for the same resource',
        );
      }
      if (
        resource.deletedAt ||
        !resource.isAvailable ||
        new Date(resource.startsAt) <= now
      ) {
        throw new ConflictException(
          `Resource with id ${resource.id} is not open for booking`,
        );
      }

      // 3. BR-07: resource and total come from the server
      const priceInCents = Math.round(Number(resource.pricePerTicket) * 100);
      const newBooking = queryRunner.manager.create(Bookings, {
        user: { id: user.id },
        resource: { id: resource.id },
        totalAmount: (priceInCents * holds.length) / 100,
        status: BookingStatus.Pending,
      });
      const saved = await queryRunner.manager.save(newBooking);

      // 4. link the holds to the booking
      await queryRunner.manager.update(
        SeatHolds,
        { id: In(booking.holdIds) },
        { bookingId: saved.id },
      );

      await queryRunner.commitTransaction();
      return await this.findBookingDetails(saved.id);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to create booking');
    } finally {
      await queryRunner.release();
    }
  }

  async getMyBookings(
    query: BookingQueryDto,
    user: JwtPayload,
  ): Promise<{
    data: Bookings[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: FindOptionsWhere<Bookings> = { user: { id: user.id } };
    if (query.resourceId) {
      where.resource = { id: query.resourceId };
    }
    return await this.findPage(where, query);
  }

  // admin: all bookings, organizer: bookings of own resources
  async getAllBookings(
    query: BookingQueryDto,
    user: JwtPayload,
  ): Promise<{
    data: Bookings[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const resourceWhere: FindOptionsWhere<Resources> = {};
    if (query.resourceId) {
      resourceWhere.id = query.resourceId;
    }
    if (user.role === Role.Organizer) {
      resourceWhere.organizer = { id: user.id };
    }

    const where: FindOptionsWhere<Bookings> = {};
    if (Object.keys(resourceWhere).length > 0) {
      where.resource = resourceWhere;
    }
    return await this.findPage(where, query);
  }

  // customer: own booking, organizer: booking of own resource, admin: any
  async getBookingById(id: number, user: JwtPayload): Promise<BookingDetails> {
    const booking = await this.findBookingDetails(id);
    const isOwner = booking.user.id === user.id;
    const isOrganizer = booking.resource.organizer.id === user.id;
    if (
      user.role !== Role.Admin &&
      !(user.role === Role.Customer && isOwner) &&
      !(user.role === Role.Organizer && isOrganizer)
    ) {
      throw new ForbiddenException('You can only view your own bookings');
    }
    return booking;
  }

  // T5: bookings + seat_holds + payments + tickets in one transaction
  async cancelBooking(
    id: number,
    user: JwtPayload,
    context: AuditContext,
  ): Promise<string> {
    const cutoffHours = Number(
      this.configService.get('CANCELLATION_CUTOFF_HOURS') ?? 24,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. lock the booking
      const booking = await this.lockBooking(queryRunner, id);
      this.checkOwner(booking, user);
      if (booking.status === BookingStatus.Cancelled) {
        throw new ConflictException(
          `Booking with id ${id} is already cancelled`,
        );
      }
      if (booking.status === BookingStatus.Expired) {
        throw new ConflictException(
          `Booking with id ${id} has expired and cannot be cancelled`,
        );
      }

      const oldStatus = booking.status;
      let refundedPayment: Payments | null = null;
      let cancelledTickets: Tickets[] = [];

      if (booking.status === BookingStatus.Pending) {
        // a pending booking can be cancelled at any time; its holds are released
        await queryRunner.manager.update(
          SeatHolds,
          { bookingId: id, status: HoldStatus.Active },
          { status: HoldStatus.Cancelled },
        );
      } else {
        // 2. BR-09: confirmed booking only until the cut-off
        const hoursLeft =
          (new Date(booking.resource.startsAt).getTime() - Date.now()) /
          3_600_000;
        if (hoursLeft < cutoffHours) {
          throw new ConflictException(
            `A confirmed booking can only be cancelled until ${cutoffHours} hours before the start`,
          );
        }

        // 3. holds -> cancelled
        await queryRunner.manager.update(
          SeatHolds,
          { bookingId: id, status: HoldStatus.Completed },
          { status: HoldStatus.Cancelled },
        );

        // 4. payment -> refunded (mock, full refund)
        refundedPayment = await queryRunner.manager
          .createQueryBuilder(Payments, 'payment')
          .where('payment.booking_id = :id', { id: id })
          .andWhere('payment.status = :status', {
            status: PaymentStatus.Completed,
          })
          .setLock('pessimistic_write')
          .getOne();
        if (refundedPayment) {
          await queryRunner.manager.update(Payments, refundedPayment.id, {
            status: PaymentStatus.Refunded,
          });
          await this.auditService.writeLog(
            {
              userId: user.id,
              action: AuditAction.Refund,
              entityName: 'payments',
              entityId: refundedPayment.id,
              oldValues: { status: PaymentStatus.Completed },
              newValues: {
                status: PaymentStatus.Refunded,
                amount: refundedPayment.amount,
              },
              context: context,
            },
            queryRunner.manager,
          );
        }

        // 5. tickets -> cancelled; a used ticket blocks the cancellation
        const tickets = await queryRunner.manager
          .createQueryBuilder(Tickets, 'ticket')
          .where('ticket.booking_id = :id', { id: id })
          .orderBy('ticket.id', 'ASC')
          .setLock('pessimistic_write')
          .getMany();
        if (tickets.some((ticket) => ticket.status === TicketStatus.Used)) {
          throw new ConflictException(
            'This booking has a used ticket and cannot be cancelled',
          );
        }
        cancelledTickets = tickets.filter(
          (ticket) => ticket.status === TicketStatus.Issued,
        );
        await queryRunner.manager
          .createQueryBuilder()
          .update(Tickets)
          .set({ status: TicketStatus.Cancelled })
          .where('booking_id = :id', { id: id })
          .andWhere('status = :status', { status: TicketStatus.Issued })
          .execute();
      }

      // 6. booking -> cancelled
      await queryRunner.manager.update(Bookings, id, {
        status: BookingStatus.Cancelled,
      });
      await this.auditService.writeLog(
        {
          userId: user.id,
          action: AuditAction.Cancel,
          entityName: 'bookings',
          entityId: id,
          oldValues: { status: oldStatus },
          newValues: {
            status: BookingStatus.Cancelled,
            cancelledTickets: cancelledTickets.map((t) => t.ticketNumber),
          },
          context: context,
        },
        queryRunner.manager,
      );

      // 7. commit, then email
      await queryRunner.commitTransaction();

      await this.mailService.sendCancellationNotice({
        to: booking.user.email,
        name: booking.user.name,
        bookingId: booking.id,
        resourceName: booking.resource.name,
        startsAt: booking.resource.startsAt,
        amount: booking.totalAmount,
        ticketNumbers: cancelledTickets.map((ticket) => ticket.ticketNumber),
        refunded: refundedPayment !== null,
      });

      return `Booking cancelled with id ${id}`;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to cancel booking');
    } finally {
      await queryRunner.release();
    }
  }

  // BR-09: only a pending booking can be deleted; its holds are released
  async deleteBooking(id: number, user: JwtPayload): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await this.lockBooking(queryRunner, id);
      this.checkOwner(booking, user);
      if (booking.status !== BookingStatus.Pending) {
        throw new ConflictException(
          `Booking with id ${id} is ${booking.status}; only a pending booking can be deleted`,
        );
      }
      const attempts = await queryRunner.manager.count(Payments, {
        where: { booking: { id: id } },
      });
      if (attempts > 0) {
        throw new ConflictException(
          'Booking has payment attempts; cancel it instead',
        );
      }

      // holds -> cancelled and unlinked, then the booking row is removed
      await queryRunner.manager.update(
        SeatHolds,
        { bookingId: id, status: HoldStatus.Active },
        { status: HoldStatus.Cancelled },
      );
      await queryRunner.manager.update(
        SeatHolds,
        { bookingId: id },
        { bookingId: null },
      );
      const result = (await queryRunner.manager.delete(Bookings, id)).affected;
      if (result == null || result === 0) {
        throw new NotFoundException(`Booking with id ${id} not found`);
      }

      await queryRunner.commitTransaction();
      return `Booking deleted with id ${id}`;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete booking');
    } finally {
      await queryRunner.release();
    }
  }

  private async findPage(
    where: FindOptionsWhere<Bookings>,
    query: BookingQueryDto,
  ): Promise<{
    data: Bookings[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.bookingsRepo.findAndCount({
      where: where,
      relations: { user: true, resource: true },
      withDeleted: true,
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    await this.showExpired(data);

    return {
      data: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findBookingDetails(id: number): Promise<BookingDetails> {
    const booking = await this.bookingsRepo.findOne({
      where: { id: id },
      relations: {
        user: true,
        resource: { organizer: true, location: true },
        tickets: { seat: true },
        payments: true,
      },
      withDeleted: true,
    });
    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    const holds = await this.dataSource.getRepository(SeatHolds).find({
      where: { bookingId: id },
      relations: { seat: true },
      order: { id: 'ASC' },
    });
    await this.showExpired([booking]);
    return Object.assign(booking, { holds: holds });
  }

  // BR-11: a pending booking whose holds have all expired is shown as expired
  private async showExpired(bookings: Bookings[]): Promise<void> {
    const pendingIds = bookings
      .filter((booking) => booking.status === BookingStatus.Pending)
      .map((booking) => booking.id);
    if (pendingIds.length === 0) {
      return;
    }
    const validHolds = await this.dataSource.getRepository(SeatHolds).find({
      where: {
        bookingId: In(pendingIds),
        status: HoldStatus.Active,
        expiresAt: MoreThan(new Date()),
      },
    });
    const stillValid = new Set(validHolds.map((hold) => hold.bookingId));
    for (const booking of bookings) {
      if (
        booking.status === BookingStatus.Pending &&
        !stillValid.has(booking.id)
      ) {
        booking.status = BookingStatus.Expired;
      }
    }
  }

  private async lockBooking(
    queryRunner: QueryRunner,
    id: number,
  ): Promise<Bookings> {
    const booking = await queryRunner.manager
      .createQueryBuilder(Bookings, 'booking')
      .innerJoinAndSelect('booking.user', 'user')
      .innerJoinAndSelect('booking.resource', 'resource')
      .withDeleted()
      .where('booking.id = :id', { id: id })
      .setLock('pessimistic_write', undefined, ['booking'])
      .getOne();
    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    return booking;
  }

  // customer: own booking only, admin: any
  private checkOwner(booking: Bookings, user: JwtPayload): void {
    if (user.role !== Role.Admin && booking.user.id !== user.id) {
      throw new ForbiddenException('You can only change your own bookings');
    }
  }
}
