
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        message = (body as { message?: string | string[] }).message ?? message;
      }
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as QueryFailedError & { code?: string }).code;
      if (code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        message = 'A record with this value already exists';
      } else if (code === '23503') {
        statusCode = HttpStatus.CONFLICT;
        message = 'This record is linked to other records';
      } else if (code === '23514') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'A value breaks a database rule';
      } else {
        this.logger.error(exception.message);
      }
    } else {
      this.logger.error(exception);
    }

    response.status(statusCode).json({
      success: false,
      statusCode: statusCode,
      error: this.errorName(statusCode),
      message: message,
      path: request.originalUrl,
      requestId: request.headers['x-request-id'] ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  // 404 -> 'Not Found', 409 -> 'Conflict'
  private errorName(statusCode: number): string {
    const name = HttpStatus[statusCode] ?? 'INTERNAL_SERVER_ERROR';
    return name
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  
}