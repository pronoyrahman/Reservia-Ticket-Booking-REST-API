import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export type ApiResponse = {
  success: true;
  message: string;
  data: unknown;
  meta?: unknown;
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    return next.handle().pipe(
      map((result: unknown) => {
        // service returned a message, e.g. "Location deleted with id 3"
        if (typeof result === 'string') {
          return { success: true, message: result, data: null };
        }

        // paginated list: { data, meta }
        if (
          result !== null &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result
        ) {
          const page = result as { data: unknown; meta: unknown };
          return {
            success: true,
            message: 'OK',
            data: page.data,
            meta: page.meta,
          };
        }

        // any other object or array
        return { success: true, message: 'OK', data: result ?? null };
      }),
    );
  }
}
