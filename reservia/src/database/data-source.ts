import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Ticket } from '../tickets/entities/ticket.entity.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'reservia_db',
  entities: [Booking, Ticket, Payment],
  migrations: ['src/database/migrations/*.{ts,js}'],
  synchronize: false,
});
