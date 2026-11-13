import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { AuditAction } from '../../common/enums/audit-action.enum.js';

export class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId?: number;

  @IsOptional()
  @IsEnum(AuditAction, {
    message:
      'action must be CREATE, UPDATE, DELETE, CANCEL, REFUND or CHECK_IN',
  })
  action?: AuditAction;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
