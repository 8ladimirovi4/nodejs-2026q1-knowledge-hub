import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    this.logErrorWithStackTrace(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.getResponsePayload(exception);

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getResponsePayload(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    if (
      exception instanceof NotFoundError ||
      exception instanceof ValidationError ||
      exception instanceof UnauthorizedError ||
      exception instanceof ForbiddenError
    ) {
      const status = exception.statusCode;
      return {
        status,
        message: exception.message,
        error: this.httpStatusName(status) ?? 'Error',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] } | undefined)
              ?.message ?? 'Internal server error');
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : rawMessage;
      const error =
        typeof exceptionResponse === 'string'
          ? 'Error'
          : ((exceptionResponse as { error?: string } | undefined)?.error ??
            this.httpStatusName(status) ??
            'Error');
      return { status, message, error };
    }

    if (this.isDatabaseUnavailableError(exception)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database is unavailable',
        error:
          this.httpStatusName(HttpStatus.SERVICE_UNAVAILABLE) ??
          'Service Unavailable',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    };
  }

  private isDatabaseUnavailableError(exception: unknown): boolean {
    if (exception === null || typeof exception !== 'object') {
      return false;
    }
    const e = exception as {
      code?: unknown;
      name?: unknown;
    };
    const prismaConnectivityCodes = new Set([
      'P1001',
      'P1002',
      'P1017',
      'P2024',
    ]);
    if (typeof e.code === 'string' && prismaConnectivityCodes.has(e.code)) {
      return true;
    }
    if (e.name === 'PrismaClientInitializationError') {
      return true;
    }
    const nodeNetworkCodes = new Set([
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
    ]);
    if (typeof e.code === 'string' && nodeNetworkCodes.has(e.code)) {
      return true;
    }
    return false;
  }

  private httpStatusName(status: number): string | undefined {
    return HttpStatus[status] as string | undefined;
  }

  private logErrorWithStackTrace(exception: unknown): void {
    if (exception instanceof Error) {
      const stack = exception.stack ?? 'No stack trace available';
      this.logger.error(exception.message, stack);
      return;
    }
    this.logger.error(`Unhandled exception (non-Error): ${String(exception)}`);
  }
}
