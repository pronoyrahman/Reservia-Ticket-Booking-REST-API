import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type TicketStatus = 'pending' | 'valid' | 'used' | 'cancelled';

@Entity({ name: 'tickets' })
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'booking_id', type: 'integer' })
  bookingId!: number;

  @Column({ name: 'seat_id', type: 'integer' })
  seatId!: number;

  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: TicketStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
