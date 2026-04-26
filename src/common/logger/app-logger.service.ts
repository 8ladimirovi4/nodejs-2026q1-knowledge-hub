import { ConsoleLogger, type LogLevel, type LoggerService } from '@nestjs/common';
import { getNestLogLevelsFromEnv } from '../config/nest-logger.config';
import { isLogLevelEnabled } from './log-levels.util';

type JsonLogRecord = Record<string, unknown>;

export class AppLogger implements LoggerService {
  private logLevels: LogLevel[];
  private readonly console: ConsoleLogger;
  private readonly isProd: boolean;

  constructor() {
    this.isProd = process.env.NODE_ENV === 'production';
    this.logLevels = getNestLogLevelsFromEnv();
    this.console = new ConsoleLogger(undefined, { logLevels: this.logLevels });
  }

  setLogLevels(levels: LogLevel[]): void {
    this.logLevels = levels;
    this.console.setLogLevels?.(levels);
  }

  log(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('log', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.log(message, ...optional);
      return;
    }
    this.writeJson('log', false, message, optional);
  }

  error(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('error', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.error(message, ...optional);
      return;
    }
    this.writeJson('error', true, message, optional);
  }

  warn(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('warn', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.warn(message, ...optional);
      return;
    }
    this.writeJson('warn', true, message, optional);
  }

  debug(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('debug', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.debug?.(message, ...optional);
      return;
    }
    this.writeJson('debug', false, message, optional);
  }

  verbose(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('verbose', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.verbose?.(message, ...optional);
      return;
    }
    this.writeJson('verbose', false, message, optional);
  }

  fatal(message: any, ...optional: any[]) {
    if (!isLogLevelEnabled('fatal', this.logLevels)) {
      return;
    }
    if (!this.isProd) {
      this.console.fatal?.(message, ...optional);
      return;
    }
    this.writeJson('fatal', true, message, optional);
  }

  private writeJson(
    level: string,
    useStderr: boolean,
    message: any,
    optional: any[],
  ) {
    const line =
      JSON.stringify(this.buildJsonRecord(level, message, optional)) + '\n';
    const out = useStderr ? process.stderr : process.stdout;
    out.write(line);
  }

  private buildJsonRecord(
    level: string,
    first: any,
    rest: any[],
  ): JsonLogRecord {
    const record: JsonLogRecord = {
      level,
      time: new Date().toISOString(),
    };
    if (first instanceof Error) {
      record.message = first.message;
      record.stack = first.stack;
      if (rest.length === 1 && typeof rest[0] === 'string') {
        record.context = rest[0];
      } else if (rest.length > 0) {
        record.extra = rest;
      }
      return record;
    }
    if (
      typeof first === 'string' &&
      (level === 'error' || level === 'fatal') &&
      rest.length > 0
    ) {
      const maybeStack = rest[0];
      if (typeof maybeStack === 'string' && looksLikeStackTrace(maybeStack)) {
        record.message = first;
        record.stack = maybeStack;
        if (rest[1] !== undefined) {
          record.context = String(rest[1]);
        }
        return record;
      }
    }
    record.message = serializeValue(first);
    this.mergeOptionalTail(record, rest, false);
    return record;
  }

  private mergeOptionalTail(
    record: JsonLogRecord,
    rest: any[],
    errorAlreadySet: boolean,
  ) {
    if (rest.length === 0) {
      return;
    }
    if (rest.length === 1 && typeof rest[0] === 'string') {
      if (!errorAlreadySet && !record.context) {
        record.context = rest[0];
      } else {
        record.extra = rest;
      }
      return;
    }
    record.extra = rest;
  }
}

function looksLikeStackTrace(s: string) {
  return s.includes('    at ') || s.includes('at ');
}

function serializeValue(v: unknown): string {
  if (typeof v === 'string') {
    return v;
  }
  if (v === null || v === undefined) {
    return String(v);
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '[unserializable]';
    }
  }
  return String(v);
}
