import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditLogs } from './entities/audit-logs.entity.js';
import { AuditQueryDto } from './dtos/audit-query.dto.js';
import type { AuditContext } from './audit-context.decorator.js';
import { AuditAction } from '../common/enums/audit-action.enum.js';

export type AuditEntry = {
  userId: number | null;
  action: AuditAction;
  entityName: string;
  entityId: number | string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  context?: AuditContext;
};

// never stored in old_values / new_values
const SECRET_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
];

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogs)
    private readonly auditRepo: Repository<AuditLogs>,
  ) {}

  // pass the transaction's manager so the audit row commits or rolls back with the change
  async writeLog(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AuditLogs) : this.auditRepo;
    const log = repo.create({
      user: entry.userId ? { id: entry.userId } : null,
      action: entry.action,
      entityName: entry.entityName,
      entityId: String(entry.entityId),
      oldValues: this.removeSecrets(entry.oldValues),
      newValues: this.removeSecrets(entry.newValues),
      ipAddress: entry.context?.ipAddress ?? null,
      requestId: entry.context?.requestId ?? null,
    });
    await repo.save(log);
  }

  async getAllAuditLogs(query: AuditQueryDto): Promise<{
    data: AuditLogs[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<AuditLogs> = {};
    if (query.entityName) {
      where.entityName = query.entityName;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.userId) {
      where.user = { id: query.userId };
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.from && query.to) {
      if (new Date(query.from) > new Date(query.to)) {
        throw new BadRequestException('from must be before to');
      }
      where.createdAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.createdAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.createdAt = LessThanOrEqual(new Date(query.to));
    }

    const [data, total] = await this.auditRepo.findAndCount({
      where: where,
      relations: { user: true },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAuditLogById(id: number): Promise<AuditLogs> {
    const log = await this.auditRepo.findOne({
      where: { id: id },
      relations: { user: true },
    });
    if (!log) {
      throw new NotFoundException(`Audit log with id ${id} not found`);
    }
    return log;
  }

  private removeSecrets(
    values?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!values) {
      return null;
    }
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (!SECRET_KEYS.includes(key.toLowerCase())) {
        clean[key] = value;
      }
    }
    return clean;
  }
}
