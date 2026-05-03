import { describe, expect, it } from 'vitest';
import { isLogLevelEnabled } from './log-levels.util';

describe('isLogLevelEnabled', () => {
  it('treats one threshold so higher severities are on', () => {
    const levels: Parameters<typeof isLogLevelEnabled>[1] = ['log'];
    expect(isLogLevelEnabled('log', levels)).toBe(true);
    expect(isLogLevelEnabled('warn', levels)).toBe(true);
    expect(isLogLevelEnabled('error', levels)).toBe(true);
    expect(isLogLevelEnabled('debug', levels)).toBe(false);
  });

  it('warn threshold hides log', () => {
    const levels: Parameters<typeof isLogLevelEnabled>[1] = ['warn'];
    expect(isLogLevelEnabled('log', levels)).toBe(false);
    expect(isLogLevelEnabled('warn', levels)).toBe(true);
  });
});
