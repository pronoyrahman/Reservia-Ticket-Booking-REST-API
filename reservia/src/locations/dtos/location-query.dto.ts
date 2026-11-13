import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';

export class LocationQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  city?: string;
}
