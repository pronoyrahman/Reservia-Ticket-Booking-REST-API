import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dtos/create-payment.dto.js';
import { PaymentQueryDto } from './dtos/payment-query.dto.js';
import { Payments } from './entities/payments.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment')
  @Roles(Role.Customer)
  async createPayment(
    @Body() payment: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Payments> {
    return await this.paymentsService.createPayment(payment, user);
  }

  @Get()
  @Roles(Role.Admin)
  async getAllPayments(@Query() query: PaymentQueryDto) {
    return await this.paymentsService.getAllPayments(query);
  }

  @Get(':id')
  @Roles(Role.Customer, Role.Admin)
  async getPaymentById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<Payments> {
    return await this.paymentsService.getPaymentById(id, user);
  }
}
