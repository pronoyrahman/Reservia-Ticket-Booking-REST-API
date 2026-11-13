import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Users } from '../../users/entities/users.entity.js';
import type { Resources } from '../../resources/entities/resources.entity.js';
import type { Tickets } from '../../tickets/entities/tickets.entity.js';
import type { Payments } from '../../payments/entities/payments.entity.js';
import { BookingStatus } from '../../common/enums/booking-status.enum.js';

@Entity('bookings')
@Check('"total_amount" >= 0')
export class Bookings {
  @PrimaryGeneratedColumn()
  id: number;

  // the customer, always taken from the token
  @ManyToOne('Users', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: Users;

  // set by the server from the holds' seats (BR-07)
  @ManyToOne('Resources', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'resource_id',
  })
  resource: Resources;

  // number of seats x price_per_ticket, fixed at creation (BR-07)
  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  totalAmount: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: BookingStatus.Pending,
  })
  status: BookingStatus;

  @OneToMany('Tickets', (ticket: Tickets) => ticket.booking)
  tickets: Tickets[];

  @OneToMany('Payments', (payment: Payments) => payment.booking)
  payments: Payments[];

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
