import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from './audit.service.js';
import { SKIP_AUDIT_KEY } from './skip-audit.decorator.js';
import { AuditAction } from '../common/enums/audit-action.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

const ACTIONS: Record<string, AuditAction> = {
  POST: AuditAction.Create,
  PUT: AuditAction.Update,
  PATCH: AuditAction.Update,
  DELETE: AuditAction.Delete,
};

// first path segment -> table name (when they differ)
const TABLE_NAMES: Record<string, string> = {
  holds: 'seat_holds',
};

// login / register are not data changes worth auditing (and carry passwords)
const SKIPPED_PATHS = ['auth'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const action = ACTIONS[request.method];
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const firstSegment =
      request.originalUrl.split('?')[0].split('/').filter(Boolean)[0] ?? '';

    if (!action || skip || SKIPPED_PATHS.includes(firstSegment)) {
      return next.handle();
    }

    // written only after the route succeeded
    return next.handle().pipe(
      tap((result: unknown) => {
        const user = request.user as JwtPayload | undefined;
        const requestId = request.headers['x-request-id'];
        const body: unknown = request.body;
        this.auditService
          .writeLog({
            userId: user?.id ?? null,
            action: action,
            entityName: TABLE_NAMES[firstSegment] ?? firstSegment,
            entityId: this.findEntityId(request, result),
            newValues:
              action !== AuditAction.Delete &&
              body !== null &&
              typeof body === 'object'
                ? (body as Record<string, unknown>)
                : null,
            context: {
              ipAddress: request.ip ?? null,
              requestId: typeof requestId === 'string' ? requestId : null,
            },
          })
          .catch((error: unknown) => {
            this.logger.error(
              `Could not write audit log: ${(error as Error).message}`,
            );
          });
      }),
    );
  }

  // :id from the URL, otherwise the id of the created record
  private findEntityId(request: Request, result: unknown): string {
    const params = request.params as Record<string, string | undefined>;
    if (params.id) {
      return params.id;
    }
    let data = result;
    if (
      data !== null &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data
    ) {
      data = (data as { data: unknown }).data;
    }
    if (data !== null && typeof data === 'object' && 'id' in data) {
      return String((data as { id: unknown }).id);
    }
    return '-';
  }
}
