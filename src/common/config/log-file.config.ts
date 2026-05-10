import { mkdirSync } from 'fs';
import { join } from 'path';

const DEFAULT_MAX_FILE_SIZE_KB = 1024;

const DEFAULT_RELATIVE_LOG_DIR = 'logs';

export function getLogDirectory(): string {
  const raw = process.env.LOG_DIR?.trim();
  if (!raw) {
    return join(process.cwd(), DEFAULT_RELATIVE_LOG_DIR);
  }
  return join(process.cwd(), raw);
}

export function ensureLogDirectory(): string {
  const dir = getLogDirectory();
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLogMaxFileSizeKb(
  value: string | undefined = process.env.LOG_MAX_FILE_SIZE,
): number {
  if (value == null || value.trim() === '') {
    return DEFAULT_MAX_FILE_SIZE_KB;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_FILE_SIZE_KB;
}
