import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

const SLOW_REQUEST_MS = 500;

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Timing');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        response.setHeader('X-Response-Time', `${duration}ms`);
        if (duration > SLOW_REQUEST_MS) {
          this.logger.warn(
            `Slow request: ${request.method} ${request.url} took ${duration}ms`,
          );
        }
      }),
    );
  }
}
