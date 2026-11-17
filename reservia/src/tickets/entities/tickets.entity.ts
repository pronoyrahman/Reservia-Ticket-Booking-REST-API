import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Bookings } from '../../bookings/entities/bookings.entity.js';
import type { Seats } from '../../seats/entities/seats.entity.js';
import { TicketStatus } from '../../common/enums/ticket-status.enum.js';

@Entity('tickets')
@Index('uq_valid_ticket_per_seat', ['seat'], {
  unique: true,
  where: `"status" IN ('issued', 'used')`,
})
@Check('"price" >= 0')
export class Tickets {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Bookings', (booking: Bookings) => booking.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'booking_id',
  })
  booking: Bookings;

  @ManyToOne('Seats', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'seat_id',
  })
  seat: Seats;

  @Column({
    name: 'ticket_number',
    type: 'varchar',
    length: 30,
    unique: true,
    nullable: false,
  })
  ticketNumber: string;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  price: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: TicketStatus.Issued,
  })
  status: TicketStatus;

  @Column({
    name: 'used_at',
    type: 'timestamptz',
    nullable: true,
  })
  usedAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',})
  updatedAt: Date;
}
