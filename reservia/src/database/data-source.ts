import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bookings } from '../bookings/entities/bookings.entity.js';
import { Payments } from '../payments/entities/payments.entity.js';
import { Tickets } from '../tickets/entities/tickets.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'reservia_db',
  entities: [Bookings, Tickets, Payments],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
});
