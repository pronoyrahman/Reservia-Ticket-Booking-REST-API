import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { SeatStatus } from '../../common/enums/seat-status.enum.js';

export class SeatQueryDto extends PaginationQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  resourceId?: number;

  @IsEnum(SeatStatus, { message: 'status must be available or blocked' })
  @IsOptional()
  status?: SeatStatus;
}