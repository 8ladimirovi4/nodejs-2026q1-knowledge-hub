import { afterEach, describe, expect, it } from 'vitest';
import { getLogMaxFileSizeKb } from './log-file.config';

describe('getLogMaxFileSizeKb', () => {
  afterEach(() => {
    delete process.env.LOG_MAX_FILE_SIZE;
  });

  it('defaults to 1024', () => {
    expect(getLogMaxFileSizeKb(undefined)).toBe(1024);
  });

  it('reads valid KB from env', () => {
    expect(getLogMaxFileSizeKb('100')).toBe(100);
  });

  it('falls back for invalid', () => {
    expect(getLogMaxFileSizeKb('not-a-number')).toBe(1024);
  });
});
