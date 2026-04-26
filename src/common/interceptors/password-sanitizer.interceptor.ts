import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function sanitizePasswords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePasswords(item));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'password')
      .map(([key, nestedValue]) => [key, sanitizePasswords(nestedValue)]);

    return Object.fromEntries(entries);
  }

  return value;
}

@Injectable()
export class PasswordSanitizerInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => sanitizePasswords(data)));
  }
}
