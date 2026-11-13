import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import type { Resources } from '../../resources/entities/resources.entity.js';
import type { Users } from '../../users/entities/users.entity.js';
@Entity('locations')
@Unique(['name', 'address'])
export class Locations {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Users', { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'created_by',
  })
  createdBy: Users;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  city: string;

  @Column({
    name: 'address',
    type: 'text',
    nullable: false,
  })
  address: string;

  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  latitude: number;

  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  longitude: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany('Resources', (resource: Resources) => resource.location)
  resources: Resources[];

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
