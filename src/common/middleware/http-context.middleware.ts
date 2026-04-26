import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const hasAuth = Boolean(req.headers.authorization);

    this.logger.log(
      `→ ${method} ${url} query=${stringifyForLog(
        req.query,
      )} body=${stringifyForLog(
        req.body,
      )} [authorization: ${hasAuth ? 'present' : 'absent'}]`,
    );

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      this.logger.log(
        `← ${method} ${url} status=${res.statusCode} time=${ms}ms`,
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
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
