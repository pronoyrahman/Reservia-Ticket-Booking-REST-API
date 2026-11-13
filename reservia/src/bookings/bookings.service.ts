import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { Booking } from './entities/booking.entity.js';
import { BookingQueryDto } from './dtos/booking-query.dto.js';

type HeldSeat = {
  id: number;
  resource_id: number;
  label: string;
  price: string | number;
};

function moneyToCents(value: string | number): number {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new ConflictException('A seat has an invalid price in the database');
  }
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ticketsService: TicketsService,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async create(userId: number, seatIds: number[]) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock holds and seats so concurrent requests cannot book the same seats.
        const seats = (await manager.query(
          `SELECT s.id, s.resource_id, s.label,
                  COALESCE(s.price, r.price_base) AS price
           FROM seat_holds sh
           JOIN seats s ON s.id = sh.seat_id
           JOIN resources r ON r.id = s.resource_id
           WHERE sh.user_id = $1
             AND sh.seat_id = ANY($2::integer[])
             AND sh.resource_id = s.resource_id
             AND sh.status = 'active'
             AND sh.expires_at > NOW()
           ORDER BY s.id
           FOR UPDATE OF sh, s`,
          [userId, seatIds],
        )) as HeldSeat[];

        if (seats.length !== seatIds.length) {
          throw new ConflictException(
            'Every requested seat must have an active, unexpired hold owned by you',
          );
        }

        const resourceId = seats[0].resource_id;
        if (seats.some((seat) => seat.resource_id !== resourceId)) {
          throw new ConflictException('All seats in one booking must belong to one resource');
        }

        const totalCents = seats.reduce((sum, seat) => sum + moneyToCents(seat.price), 0);
        const bookingRepository = manager.getRepository(Booking);
        const booking = await bookingRepository.save(
          bookingRepository.create({
            userId,
            resourceId,
            totalPrice: (totalCents / 100).toFixed(2),
            status: 'pending',
          }),
        );

        const tickets = await this.ticketsService.createForBooking(
          manager,
          booking.id,
          seats.map((seat) => seat.id),
        );

        await manager.query(
          `UPDATE seat_holds
           SET status = 'completed'
           WHERE user_id = $1 AND seat_id = ANY($2::integer[]) AND status = 'active'`,
          [userId, seatIds],
        );

        return {
          booking_id: booking.id,
          total_price: booking.totalPrice,
          status: booking.status,
          ticket_codes: tickets.map((ticket) => ticket.code),
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('One or more seats already have a ticket');
      }
      throw error;
    }
  }

  async findByUserId(userId: number, query: BookingQueryDto) {
    const [items, total] = await this.bookingsRepository.findAndCount({
      where: { userId },
      order: { id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: items,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  async findById(id: number, userId: number) {
    const booking = await this.bookingsRepository.findOne({
      where: { id, userId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const tickets = await this.dataSource.query(
      `SELECT t.id, t.code, t.status, t.seat_id, s.label AS seat_label
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       WHERE t.booking_id = $1
       ORDER BY t.id`,
      [id],
    );

    return {
      booking_id: booking.id,
      resource_id: booking.resourceId,
      total_price: booking.totalPrice,
      status: booking.status,
      created_at: booking.createdAt,
      tickets,
    };
  }
}
