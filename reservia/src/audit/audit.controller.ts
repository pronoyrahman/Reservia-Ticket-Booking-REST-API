import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditQueryDto } from './dtos/audit-query.dto.js';
import { AuditLogs } from './entities/audit-logs.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('audit-logs')
@Roles(Role.Admin)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAllAuditLogs(@Query() query: AuditQueryDto) {
    return await this.auditService.getAllAuditLogs(query);
  }

  @Get(':id')
  async getAuditLogById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditLogs> {
    return await this.auditService.getAuditLogById(id);
  }
}
