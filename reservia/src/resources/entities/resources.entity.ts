import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Locations } from '../../locations/entities/locations.entity.js';
import type { Seats } from '../../seats/entities/seats.entity.js';

@Entity('resources')
@Check('"ends_at" > "starts_at"')
@Check('"capacity" > 0')
@Check('"seats_per_row" > 0')
@Check('"price_per_ticket" >= 0')
export class Resources {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne('Locations', (location: Locations) => location.resources, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'location_id',
  })
  location: Locations;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  name: string;

  @Index()
  @Column({
    name: 'type',
    type: 'varchar',
    length: 30,
    nullable: false,
  })
  type: string;

  @Index()
  @Column({
    name: 'starts_at',
    type: 'timestamptz',
    nullable: false,
  })
  startsAt: Date;

  @Column({
    name: 'ends_at',
    type: 'timestamptz',
    nullable: false,
  })
  endsAt: Date;

  @Column({
    name: 'seats_per_row',
    type: 'int',
    default: 10,
  })
  seatsPerRow: number;

  @Column({
    name: 'capacity',
    type: 'int',
    nullable: false,
  })
  capacity: number;

  @Column({
    name: 'price_per_ticket',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  pricePerTicket: number;

  @Column({
    name: 'is_available',
    type: 'boolean',
    default: true,
  })
  isAvailable: boolean;
   @OneToMany('Seats', (seat: Seats) => seat.resource)
  seats: Seats[];

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

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
  })
  deletedAt: Date;
}
