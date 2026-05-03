import { LOG_REDACTED, sanitizeValueForLog } from './sanitize-for-log';

describe('sanitizeValueForLog', () => {
  it('replaces password and token fields with [REDACTED] (nested)', () => {
    const input = {
      login: 'a',
      password: 's1',
      oldPassword: 's2',
      newPassword: 's3',
      refreshToken: 'rt',
      accessToken: 'at',
      token: 't',
      meta: { password: 'nested', other: 1 },
    };
    const out = sanitizeValueForLog(input) as Record<string, unknown>;
    expect(out.login).toBe('a');
    expect(out.password).toBe(LOG_REDACTED);
    expect(out.oldPassword).toBe(LOG_REDACTED);
    expect(out.newPassword).toBe(LOG_REDACTED);
    expect(out.refreshToken).toBe(LOG_REDACTED);
    expect(out.accessToken).toBe(LOG_REDACTED);
    expect(out.token).toBe(LOG_REDACTED);
    expect((out.meta as Record<string, unknown>).password).toBe(LOG_REDACTED);
    expect((out.meta as Record<string, unknown>).other).toBe(1);
  });

  it('treats object keys case-insensitively for known sensitive names', () => {
    const out = sanitizeValueForLog({
      Password: 'x',
      REFRESH_TOKEN: 'y',
    }) as Record<string, unknown>;
    expect(out.Password).toBe(LOG_REDACTED);
    expect(out.REFRESH_TOKEN).toBe(LOG_REDACTED);
  });

  it('redacts in arrays', () => {
    const out = sanitizeValueForLog([
      { token: 'a' },
      { login: 'b' },
    ]) as unknown[];
    expect((out[0] as Record<string, unknown>).token).toBe(LOG_REDACTED);
    expect((out[1] as Record<string, unknown>).login).toBe('b');
  });

  it('does not mutate the source object', () => {
    const source = { user: { password: 'secret' } };
    sanitizeValueForLog(source);
    expect(source.user.password).toBe('secret');
  });

  it('leaves null, primitives, and non-sensitive fields unchanged', () => {
    expect(sanitizeValueForLog(null)).toBeNull();
    expect(sanitizeValueForLog(undefined)).toBeUndefined();
    expect(sanitizeValueForLog(42)).toBe(42);
    expect(sanitizeValueForLog({ name: 'ok' })).toEqual({ name: 'ok' });
  });
});
