import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Users } from '../../users/entities/users.entity.js';
import type { Seats } from '../../seats/entities/seats.entity.js';
import type { Bookings } from '../../bookings/entities/bookings.entity.js';
import { HoldStatus } from '../../common/enums/hold-status.enum.js';

@Entity('seat_holds')
@Index('uq_active_hold_per_seat', ['seat'], {
  unique: true,
  where: `"status" = 'active'`,
})
@Index('idx_seat_holds_user_status', ['user', 'status'])
export class SeatHolds {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Users', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: Users;

  @ManyToOne('Seats', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'seat_id',
  })
  seat: Seats;

  @ManyToOne('Bookings', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'booking_id',
  })
  booking: Bookings | null;

  @Column({
    name: 'booking_id',
    type: 'int',
    nullable: true,
  })
  bookingId: number | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: HoldStatus.Active,
  })
  status: HoldStatus;

  @Column({
    name: 'expires_at',
    type: 'timestamptz',
    nullable: false,
  })
  expiresAt: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}