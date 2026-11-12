
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { Role } from '../../common/enums/role.enum.js';

export class GetUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role, { message: 'role must be either admin or customer' })
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}