/**
 * Replaces known sensitive request fields with a fixed placeholder before logging.
 * Does not mutate the original value.
 */
export const LOG_REDACTED = '[REDACTED]' as const;

const SENSITIVE_KEYS_NORMALIZED = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'refreshtoken',
  'accesstoken',
  'token',
]);

function normalizeKeyForLookup(key: string): string {
  return key.toLowerCase().replace(/_/g, '');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS_NORMALIZED.has(normalizeKeyForLookup(key));
}

export function sanitizeValueForLog(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValueForLog(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        out[key] = LOG_REDACTED;
      } else {
        out[key] = sanitizeValueForLog(val);
      }
    }
    return out;
  }
  return value;
}
