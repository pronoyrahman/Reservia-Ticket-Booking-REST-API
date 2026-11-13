import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { BookingStatus } from '../../common/enums/booking-status.enum.js';

export class BookingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus, {
    message: 'status must be pending, confirmed, cancelled or expired',
  })
  status?: BookingStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  resourceId?: number;
}
