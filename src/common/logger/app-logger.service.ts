import {
  ConsoleLogger,
  type LogLevel,
  type LoggerService,
} from '@nestjs/common';
import type { RotatingFileStream } from 'rotating-file-stream';
import { getNestLogLevelsFromEnv } from '../config/nest-logger.config';
import { isLogLevelEnabled } from './log-levels.util';
import { openRotatingAppLogStream } from './rotating-app-log.file';

type JsonLogRecord = Record<string, unknown>;

export class AppLogger implements LoggerService {
  private logLevels: LogLevel[];
  private readonly console: ConsoleLogger;
  private readonly isProd: boolean;
  private readonly logFile: RotatingFileStream | null;

  constructor() {
    this.isProd = process.env.NODE_ENV === 'production';
    this.logLevels = getNestLogLevelsFromEnv();
    this.console = new ConsoleLogger(undefined, { logLevels: this.logLevels });
    this.logFile = openRotatingAppLogStream();
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
      this.appendDevFileLine('log', message, optional);
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
      this.appendDevFileLine('error', message, optional);
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
      this.appendDevFileLine('warn', message, optional);
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
      this.appendDevFileLine('debug', message, optional);
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
      this.appendDevFileLine('verbose', message, optional);
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
      this.appendDevFileLine('fatal', message, optional);
      return;
    }
    this.writeJson('fatal', true, message, optional);
  }

  private writeToConsoleAndFile(line: string, useStderr: boolean) {
    const out = useStderr ? process.stderr : process.stdout;
    out.write(line);
    this.logFile?.write(line);
  }

  private appendDevFileLine(level: string, message: any, optional: any[]) {
    if (!this.logFile) {
      return;
    }
    this.logFile.write(formatDevFileLine(level, message, optional));
  }

  private writeJson(
    level: string,
    useStderr: boolean,
    message: any,
    optional: any[],
  ) {
    const line =
      JSON.stringify(this.buildJsonRecord(level, message, optional)) + '\n';
    this.writeToConsoleAndFile(line, useStderr);
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

function formatDevFileLine(
  level: string,
  message: any,
  optional: any[],
): string {
  const time = new Date().toISOString();
  const body =
    message instanceof Error ? message.message : serializeValue(message);
  const rest =
    optional.length > 0
      ? ` ${optional.map((a) => (a instanceof Error ? (a.stack ?? a.message) : String(serializeValue(a)))).join(' | ')}`
      : '';
  return `${time} [${level.toUpperCase()}] ${body}${rest}\n`;
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
