import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    this.logErrorWithStackTrace(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] } | undefined)
            ?.message ?? 'Internal server error');

    const error =
      typeof exceptionResponse === 'string'
        ? 'Error'
        : ((exceptionResponse as { error?: string } | undefined)?.error ??
          HttpStatus[status] ??
          'Error');

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private logErrorWithStackTrace(exception: unknown): void {
    if (exception instanceof Error) {
      const stack = exception.stack ?? 'No stack trace available';
      this.logger.error(exception.message, stack);
      return;
    }
    this.logger.error(
      `Unhandled exception (non-Error): ${String(exception)}`,
    );
  }
}
