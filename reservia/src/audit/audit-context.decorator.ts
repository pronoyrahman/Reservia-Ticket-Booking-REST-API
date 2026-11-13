import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuditContext = {
  ipAddress: string | null;
  requestId: string | null;
};

// gives a service the caller's IP and X-Request-Id for an audit row
export const AuditInfo = createParamDecorator(
  (data: unknown, context: ExecutionContext): AuditContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers['x-request-id'];
    return {
      ipAddress: request.ip ?? null,
      requestId: typeof requestId === 'string' ? requestId : null,
    };
  },
);
