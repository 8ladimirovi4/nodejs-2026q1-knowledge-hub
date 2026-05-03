import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { PasswordSanitizerInterceptor } from './password-sanitizer.interceptor';

describe('PasswordSanitizerInterceptor', () => {
  let interceptor: PasswordSanitizerInterceptor;

  beforeEach(() => {
    interceptor = new PasswordSanitizerInterceptor();
  });

  it('removes password from nested objects and arrays', async () => {
    const source = {
      id: 'u1',
      password: 'root-secret',
      profile: {
        login: 'john',
        password: 'nested-secret',
      },
      sessions: [{ token: 't1', password: 'session-secret' }, { token: 't2' }],
    };

    const next: CallHandler = {
      handle: () => of(source),
    };

    const result = await lastValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    );

    expect(result).toEqual({
      id: 'u1',
      profile: {
        login: 'john',
      },
      sessions: [{ token: 't1' }, { token: 't2' }],
    });
  });

  it('does not mutate original response object', async () => {
    const source = {
      user: {
        login: 'john',
        password: 'secret',
      },
    };

    const next: CallHandler = {
      handle: () => of(source),
    };

    await lastValueFrom(interceptor.intercept({} as ExecutionContext, next));

    expect(source).toEqual({
      user: {
        login: 'john',
        password: 'secret',
      },
    });
  });

  it('returns primitive values unchanged', async () => {
    const next: CallHandler = {
      handle: () => of('ok'),
    };

    const result = await lastValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    );

    expect(result).toBe('ok');
  });
});
