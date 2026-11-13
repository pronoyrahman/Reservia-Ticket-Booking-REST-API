import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { TicketQueryDto } from './dtos/ticket-query.dto.js';
import { Tickets } from './entities/tickets.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { SkipAudit } from '../audit/skip-audit.decorator.js';
import { AuditInfo } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit-context.decorator.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('me')
  @Roles(Role.Customer)
  async getMyTickets(
    @Query() query: TicketQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.ticketsService.getMyTickets(query, user);
  }

  @Get('number/:ticketNumber')
  @Roles(Role.Customer, Role.Organizer, Role.Admin)
  async getTicketByNumber(
    @Param('ticketNumber') ticketNumber: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Tickets> {
    return await this.ticketsService.getTicketByNumber(ticketNumber, user);
  }

  @Patch(':id/use')
  @Roles(Role.Organizer, Role.Admin)
  @SkipAudit()
  async useTicket(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @AuditInfo() context: AuditContext,
  ): Promise<string> {
    return await this.ticketsService.useTicket(id, user, context);
  }
}
