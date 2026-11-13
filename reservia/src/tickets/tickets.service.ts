import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Tickets } from './entities/tickets.entity.js';
import { TicketQueryDto } from './dtos/ticket-query.dto.js';
import { TicketStatus } from '../common/enums/ticket-status.enum.js';
import { AuditAction } from '../common/enums/audit-action.enum.js';
import { Role } from '../common/enums/role.enum.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuditContext } from '../audit/audit-context.decorator.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly ticketsRepo: Repository<Tickets>,
    private readonly auditService: AuditService,
  ) {}

  async getMyTickets(
    query: TicketQueryDto,
    user: JwtPayload,
  ): Promise<{
    data: Tickets[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<Tickets> = {
      booking: { user: { id: user.id } },
    };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.ticketsRepo.findAndCount({
      where: where,
      relations: { seat: true, booking: { resource: true } },
      withDeleted: true,
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // customer: own ticket, organizer: ticket for own resource, admin: any
  async getTicketByNumber(
    ticketNumber: string,
    user: JwtPayload,
  ): Promise<Tickets> {
    const ticket = await this.ticketsRepo.findOne({
      where: { ticketNumber: ticketNumber.toUpperCase() },
      relations: {
        seat: true,
        booking: {
          user: true,
          resource: { organizer: true, location: true },
        },
      },
      withDeleted: true,
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} not found`);
    }

    const isOwner = ticket.booking.user.id === user.id;
    const isOrganizer = ticket.booking.resource.organizer.id === user.id;
    if (
      user.role !== Role.Admin &&
      !(user.role === Role.Customer && isOwner) &&
      !(user.role === Role.Organizer && isOrganizer)
    ) {
      throw new ForbiddenException('You can only view your own tickets');
    }
    return ticket;
  }

  // BR-12: check a ticket in at the gate
  async useTicket(
    id: number,
    user: JwtPayload,
    context: AuditContext,
  ): Promise<string> {
    const ticket = await this.ticketsRepo.findOne({
      where: { id: id },
      relations: { booking: { resource: { organizer: true } } },
      withDeleted: true,
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }
    if (
      user.role !== Role.Admin &&
      ticket.booking.resource.organizer.id !== user.id
    ) {
      throw new ForbiddenException(
        'You can only check in tickets for your own resources',
      );
    }

    // one atomic update: two scans at the same moment give one 200 and one 409
    const usedAt = new Date();
    const result = await this.ticketsRepo
      .createQueryBuilder()
      .update(Tickets)
      .set({ status: TicketStatus.Used, usedAt: usedAt })
      .where('id = :id', { id: id })
      .andWhere('status = :status', { status: TicketStatus.Issued })
      .execute();
    if (!result.affected) {
      const current = await this.ticketsRepo.findOneBy({ id: id });
      throw new ConflictException(
        `Ticket ${ticket.ticketNumber} is ${current?.status ?? ticket.status} and cannot be checked in`,
      );
    }

    await this.auditService.writeLog({
      userId: user.id,
      action: AuditAction.CheckIn,
      entityName: 'tickets',
      entityId: id,
      oldValues: { status: TicketStatus.Issued, usedAt: null },
      newValues: { status: TicketStatus.Used, usedAt: usedAt },
      context: context,
    });

    return `Ticket ${ticket.ticketNumber} checked in`;
  }
}
