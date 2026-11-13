import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../../common/enums/payment-method.enum.js';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  bookingId: number;

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod must be card, cash or mobile',
  })
  paymentMethod: PaymentMethod;

  // BR-13: mock gateway failure, accepted only when NODE_ENV=development
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
