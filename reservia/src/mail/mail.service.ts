import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

export type BookingMail = {
  to: string;
  name: string;
  bookingId: number;
  resourceName: string;
  startsAt: Date;
  amount: number | string;
  ticketNumbers: string[];
};

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  // sent after the payment transaction is committed
  async sendBookingConfirmation(mail: BookingMail): Promise<void> {
    const startsAt = new Date(mail.startsAt).toUTCString();
    const subject = `Reservia booking #${mail.bookingId} confirmed`;
    const text =
      `Hello ${mail.name},\n\n` +
      `Your booking #${mail.bookingId} for ${mail.resourceName} (${startsAt}) is confirmed.\n` +
      `Amount paid: ${mail.amount}\n` +
      `Ticket numbers: ${mail.ticketNumbers.join(', ')}\n\n` +
      `Show your ticket number at the entrance.\n\nReservia`;
    const html =
      `<p>Hello ${this.escape(mail.name)},</p>` +
      `<p>Your booking <b>#${mail.bookingId}</b> for <b>${this.escape(mail.resourceName)}</b> (${startsAt}) is confirmed.</p>` +
      `<p>Amount paid: <b>${mail.amount}</b></p>` +
      `<p>Ticket numbers:</p><ul>` +
      mail.ticketNumbers.map((number) => `<li>${number}</li>`).join('') +
      `</ul><p>Show your ticket number at the entrance.</p><p>Reservia</p>`;
    await this.send(mail.to, subject, text, html);
  }

  // sent after the cancellation transaction is committed
  async sendCancellationNotice(
    mail: BookingMail & { refunded: boolean },
  ): Promise<void> {
    const startsAt = new Date(mail.startsAt).toUTCString();
    const subject = `Reservia booking #${mail.bookingId} cancelled`;
    const refundLine = mail.refunded
      ? `A full refund of ${mail.amount} has been issued.`
      : 'No payment was taken for this booking.';
    const ticketLine =
      mail.ticketNumbers.length > 0
        ? `Cancelled tickets: ${mail.ticketNumbers.join(', ')}`
        : '';
    const text =
      `Hello ${mail.name},\n\n` +
      `Your booking #${mail.bookingId} for ${mail.resourceName} (${startsAt}) has been cancelled.\n` +
      `${refundLine}\n${ticketLine}\n\nReservia`;
    const html =
      `<p>Hello ${this.escape(mail.name)},</p>` +
      `<p>Your booking <b>#${mail.bookingId}</b> for <b>${this.escape(mail.resourceName)}</b> (${startsAt}) has been cancelled.</p>` +
      `<p>${refundLine}</p>` +
      (ticketLine ? `<p>${ticketLine}</p>` : '') +
      `<p>Reservia</p>`;
    await this.send(mail.to, subject, text, html);
  }

  // for Pronoy's register (optional): welcome email
  async sendWelcome(to: string, name: string): Promise<void> {
    const subject = 'Welcome to Reservia';
    const text = `Hello ${name},\n\nYour Reservia account is ready. You can now browse events, hold seats and book tickets.\n\nReservia`;
    const html = `<p>Hello ${this.escape(name)},</p><p>Your Reservia account is ready. You can now browse events, hold seats and book tickets.</p><p>Reservia</p>`;
    await this.send(to, subject, text, html);
  }

  // a failed email is logged and never fails the request
  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (!this.configService.get<string>('MAIL_HOST')) {
      this.logger.warn(`MAIL_HOST is not set; "${subject}" was not sent`);
      return;
    }
    try {
      await this.mailerService.sendMail({ to, subject, text, html });
      this.logger.log(`"${subject}" sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Could not send "${subject}" to ${to}: ${(error as Error).message}`,
      );
    }
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
