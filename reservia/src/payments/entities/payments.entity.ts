import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Bookings } from '../../bookings/entities/bookings.entity.js';
import { PaymentMethod } from '../../common/enums/payment-method.enum.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';

@Entity('payments')
@Check('"amount" >= 0')
export class Payments {
  @PrimaryGeneratedColumn()
  id: number;

  // a booking may have several payment attempts (no unique here)
  @ManyToOne('Bookings', (booking: Bookings) => booking.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'booking_id',
  })
  booking: Bookings;

  // copied from bookings.total_amount
  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  // mock gateway reference, e.g. MOCK-<uuid>
  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  transactionId: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  status: PaymentStatus;

  @Column({
    name: 'paid_at',
    type: 'timestamptz',
    nullable: true,
  })
  paidAt: Date | null;

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
