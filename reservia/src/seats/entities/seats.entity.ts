import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Resources } from '../../resources/entities/resources.entity.js';
import { SeatStatus } from '../../common/enums/seat-status.enum.js';

@Entity('seats')
@Unique(['resource', 'seatNumber'])
@Check('"column_number" > 0')
export class Seats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Resources', (resource: Resources) => resource.seats, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'resource_id',
  })
  resource: Resources;

  @Column({
    name: 'seat_number',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  seatNumber: string;

  @Column({
    name: 'row_letter',
    type: 'varchar',
    length: 3,
    nullable: false,
  })
  rowLetter: string;

  @Column({
    name: 'column_number',
    type: 'int',
    nullable: false,
  })
  columnNumber: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: SeatStatus.Available,
  })
  status: SeatStatus;

  @Column({
    name: 'is_accessible',
    type: 'boolean',
    default: false,
  })
  isAccessible: boolean;

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