import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';

export class PaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: 'status must be completed, failed or refunded',
  })
  status?: PaymentStatus;
}
