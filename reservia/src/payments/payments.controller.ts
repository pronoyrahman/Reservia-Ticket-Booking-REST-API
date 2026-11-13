import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DevUserId } from '../common/dev-support/dev-user.decorator.js';
import { DevUserGuard } from '../common/dev-support/dev-user.guard.js';
import { MockWebhookDto } from './dtos/mock-webhook.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/mock')
  @UseGuards(DevUserGuard)
  handleMockWebhook(@Body() dto: MockWebhookDto) {
    return this.paymentsService.handleMockWebhook(
      dto.payment_id,
      dto.status,
      dto.amount,
    );
  }

  @Post(':bookingId/initiate')
  @UseGuards(DevUserGuard)
  initiate(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @DevUserId() userId: number,
  ) {
    return this.paymentsService.initiate(bookingId, userId);
  }

  @Get(':id')
  @UseGuards(DevUserGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @DevUserId() userId: number,
  ) {
    return this.paymentsService.findById(id, userId);
  }
}
