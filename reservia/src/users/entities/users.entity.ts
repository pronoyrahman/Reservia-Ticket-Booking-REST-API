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
    name: 'userEmail',
    type: 'varchar',
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    name: 'userPasswordHash',
    type: 'varchar',
    length: 255,
  })
  password_hash: string;

  @Column({
    name: 'userName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'userPhone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone_number: string;

  @Column({
    type: 'varchar',
    default: 'customer',
  })
  role: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}