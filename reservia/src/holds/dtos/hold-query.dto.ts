
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { HoldStatus } from '../../common/enums/hold-status.enum.js';

export class HoldQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(HoldStatus, {
    message: 'status must be active, completed, expired or cancelled',
  })
  status?: HoldStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  resourceId?: number;

  
}