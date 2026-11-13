import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTicketsPayments1710000000000 implements MigrationInterface {
  name = 'CreateBookingsTicketsPayments1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "resource_id" integer NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bookings_resource" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_bookings_status" CHECK ("status" IN ('pending', 'confirmed', 'cancelled'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" SERIAL NOT NULL,
        "booking_id" integer NOT NULL,
        "seat_id" integer NOT NULL,
        "code" varchar(8) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tickets_code" UNIQUE ("code"),
        CONSTRAINT "UQ_tickets_seat" UNIQUE ("seat_id"),
        CONSTRAINT "FK_tickets_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tickets_seat" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_tickets_status" CHECK ("status" IN ('pending', 'valid', 'used', 'cancelled'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" SERIAL NOT NULL,
        "booking_id" integer NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reference_id" varchar(80) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_booking" UNIQUE ("booking_id"),
        CONSTRAINT "UQ_payments_reference" UNIQUE ("reference_id"),
        CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_payments_status" CHECK ("status" IN ('pending', 'completed', 'failed')),
        CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "payments"');
    await queryRunner.query('DROP TABLE "tickets"');
    await queryRunner.query('DROP TABLE "bookings"');
  }
}
