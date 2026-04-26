import type { LogLevel } from '@nestjs/common';

const DEFAULT_LOG_LEVEL: SupportedLogLevel = 'log';

const SUPPORTED_LOG_LEVELS = new Set<SupportedLogLevel>([
  'log',
  'debug',
  'warn',
  'error',
  'verbose',
]);

type SupportedLogLevel = Extract<
  LogLevel,
  'log' | 'debug' | 'warn' | 'error' | 'verbose'
>;

export function getNestLogLevelsFromEnv(
  value: string | undefined = process.env.LOG_LEVEL,
): LogLevel[] {
  const raw = value?.trim().toLowerCase();
  if (!raw || !SUPPORTED_LOG_LEVELS.has(raw as SupportedLogLevel)) {
    return [DEFAULT_LOG_LEVEL];
  }
  return [raw as SupportedLogLevel];
}
