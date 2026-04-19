import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, _res: Response, next: NextFunction): void {
    const hasAuth = Boolean(req.headers.authorization);
    this.logger.log(
      `${req.method} ${req.originalUrl} [authorization: ${hasAuth ? 'present' : 'absent'}]`,
    );
    next();
  }
}
