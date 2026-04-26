import type { LogLevel } from '@nestjs/common';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  verbose: 0,
  debug: 1,
  log: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export function isLogLevelEnabled(
  targetLevel: LogLevel,
  logLevels: LogLevel[] | undefined,
): boolean {
  if (!logLevels || logLevels.length === 0) {
    return false;
  }
  if (logLevels.includes(targetLevel)) {
    return true;
  }
  const highest = Math.max(
    ...logLevels.map((level) => LOG_LEVEL_VALUES[level] ?? 0),
  );
  return LOG_LEVEL_VALUES[targetLevel] >= highest;
}
