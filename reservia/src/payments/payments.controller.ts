import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import { MockWebhookDto } from './dtos/mock-webhook.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/mock')
  @Roles(Role.Admin)
  handleMockWebhook(@Body() dto: MockWebhookDto) {
    return this.paymentsService.handleMockWebhook(
      dto.payment_id,
      dto.status,
      dto.amount,
    );
  }

  @Post(':bookingId/initiate')
  @Roles(Role.Customer)
  initiate(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.initiate(bookingId, user.id);
  }

  @Get(':id')
  @Roles(Role.Customer)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.findById(id, user.id);
  }
}