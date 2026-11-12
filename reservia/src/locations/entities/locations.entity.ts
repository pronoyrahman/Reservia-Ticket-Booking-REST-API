import {Column,CreateDateColumn,Entity,PrimaryGeneratedColumn,UpdateDateColumn,} from 'typeorm';

@Entity('locations')
export class Locations {
  @PrimaryGeneratedColumn({name:'locationId'})
  id: number;

  @Column({
    name: 'locationName',
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'locationCity',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  city: string;

  @Column({
    name: 'locationAddress',
    type: 'text',
    nullable: true,
  })
  address: string;

  @Column({
    name: 'locationLatitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  latitude: number;

  @Column({
    name: 'locationLongitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  longitude: number;

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