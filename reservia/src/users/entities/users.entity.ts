
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
    select: false,
  })
  passwordHash: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phoneNumber: string | null;

  @Column({
    name: 'role',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'customer',
  })
  role: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive: boolean;

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