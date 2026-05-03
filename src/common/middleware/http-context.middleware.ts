import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { sanitizeValueForLog } from '../sanitization/sanitize-for-log';

@Injectable()
export class HttpContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const hasAuth = Boolean(req.headers.authorization);
    const rawHeaderId = req.headers['x-request-id'];
    const traceId =
      typeof rawHeaderId === 'string' && rawHeaderId.trim().length > 0
        ? rawHeaderId.trim()
        : randomUUID();
    req.traceId = traceId;
    res.setHeader('X-Request-Id', traceId);

    this.logger.log(
      `→ ${method} ${url} traceId=${traceId} query=${stringifyForLog(
        req.query,
      )} body=${stringifyForLog(
        req.body,
      )} [authorization: ${hasAuth ? 'present' : 'absent'}]`,
    );

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      this.logger.log(
        `← ${method} ${url} traceId=${traceId} status=${res.statusCode} time=${ms}ms`,
      );
    });

    next();
  }
}

function stringifyForLog(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  const safe = sanitizeValueForLog(value);
  try {
    return JSON.stringify(safe);
  } catch {
    return '[unserializable]';
  }
}
