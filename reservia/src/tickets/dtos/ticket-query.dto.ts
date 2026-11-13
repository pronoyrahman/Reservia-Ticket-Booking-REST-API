import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto.js';
import { TicketStatus } from '../../common/enums/ticket-status.enum.js';

export class TicketQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus, {
    message: 'status must be issued, used or cancelled',
  })
  status?: TicketStatus;
}
