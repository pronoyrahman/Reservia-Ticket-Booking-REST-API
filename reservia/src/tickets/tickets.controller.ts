import { Controller, Get, Param } from '@nestjs/common';
import { TicketsService } from './tickets.service.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.ticketsService.findByCode(code);
  }
}
