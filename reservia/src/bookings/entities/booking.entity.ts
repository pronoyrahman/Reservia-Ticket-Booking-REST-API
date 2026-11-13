import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'resource_id', type: 'integer' })
  resourceId!: number;

  @Column({ name: 'total_price', type: 'numeric', precision: 10, scale: 2 })
  totalPrice!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: BookingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
