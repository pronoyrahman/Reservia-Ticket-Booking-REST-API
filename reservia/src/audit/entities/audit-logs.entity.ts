import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Users } from '../../users/entities/users.entity.js';
import { AuditAction } from '../../common/enums/audit-action.enum.js';

@Entity('audit_logs')
export class AuditLogs {
  @PrimaryGeneratedColumn()
  id: number;

  // who made the change; empty for system actions
  @ManyToOne('Users', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: Users | null;

  @Column({
    name: 'action',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  action: AuditAction;

  // table name, e.g. resources
  @Column({
    name: 'entity_name',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  entityName: string;

  @Column({
    name: 'entity_id',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  entityId: string;

  @Column({
    name: 'old_values',
    type: 'jsonb',
    nullable: true,
  })
  oldValues: Record<string, unknown> | null;

  @Column({
    name: 'new_values',
    type: 'jsonb',
    nullable: true,
  })
  newValues: Record<string, unknown> | null;

  @Column({
    name: 'ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipAddress: string | null;

  // same value as the X-Request-Id header
  @Column({
    name: 'request_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requestId: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
