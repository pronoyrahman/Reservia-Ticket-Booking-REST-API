import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { ResourceType } from '../../common/enums/resource-type.enum.js';

export class ResourceQueryDto extends PaginationQueryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  locationId?: number;

  @IsEnum(ResourceType, {
    message: 'type must be one of: concert, movie, bus, seminar, other',
  })
  @IsOptional()
  type?: ResourceType;

  @IsString()
  @IsOptional()
  city?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  to?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  search?: string;
}
