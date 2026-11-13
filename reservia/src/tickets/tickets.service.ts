import { Injectable, NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { Ticket } from './entities/ticket.entity.js';

type TicketSeat = { seatId: number; code: string; status: string };

@Injectable()
export class TicketsService {
  constructor(private readonly dataSource: DataSource) {}

  async createForBooking(
    manager: EntityManager,
    bookingId: number,
    seatIds: number[],
  ): Promise<TicketSeat[]> {
    const repository = manager.getRepository(Ticket);
    const tickets: Ticket[] = [];

    for (const seatId of seatIds) {
      const ticket = repository.create({
        bookingId,
        seatId,
        code: this.generateCode(),
        status: 'pending',
      });
      tickets.push(await repository.save(ticket));
    }

    return tickets.map(({ seatId, code, status }) => ({ seatId, code, status }));
  }

  async findByCode(code: string) {
    const rows = (await this.dataSource.query(
      `SELECT t.id, t.code, t.status, t.booking_id, t.seat_id,
              s.label AS seat_label, b.resource_id
       FROM tickets t
       JOIN bookings b ON b.id = t.booking_id
       JOIN seats s ON s.id = t.seat_id
       WHERE t.code = $1`,
      [code.toUpperCase()],
    )) as Array<Record<string, unknown>>;

    if (!rows[0]) throw new NotFoundException('Ticket not found');
    return rows[0];
  }

  private generateCode(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  }
}
