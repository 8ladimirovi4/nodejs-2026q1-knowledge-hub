import { ValidationError } from 'src/common/errors';

export type SortOrder = 'asc' | 'desc';

function singleQueryValue(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return singleQueryValue(v[0]);
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

export function normalizeListSort(
  sortBy?: string | string[],
  order?: string | string[],
): { sortBy?: string; order?: SortOrder } {
  const sb = singleQueryValue(sortBy);
  const oraw = singleQueryValue(order);
  if (oraw === undefined) {
    return { sortBy: sb, order: undefined };
  }
  const lo = oraw.toLowerCase();
  if (lo !== 'asc' && lo !== 'desc') {
    throw new ValidationError('order must be "asc" or "desc"');
  }
  return { sortBy: sb, order: lo };
}

function compareValues(a: unknown, b: unknown, mul: number): number {
  if (a === b) return 0;
  if (a == null && b == null) return 0;
  if (a == null || a === undefined) return 1;
  if (b == null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') {
    if (a < b) return -mul;
    if (a > b) return mul;
    return 0;
  }
  return (
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }) * mul
  );
}

export function applyListSort<T extends object>(
  items: T[],
  sortByRaw: string | string[] | undefined,
  orderRaw: string | string[] | undefined,
  allowedKeys: readonly string[],
): T[] {
  const { sortBy, order } = normalizeListSort(sortByRaw, orderRaw);
  if (sortBy === undefined || sortBy === '') {
    return items;
  }
  if (!allowedKeys.includes(sortBy)) {
    throw new ValidationError('sortBy is not an allowed field for this list');
  }
  const mul = (order ?? 'asc') === 'desc' ? -1 : 1;
  return [...items].sort((x, y) => {
    const vx = (x as Record<string, unknown>)[sortBy];
    const vy = (y as Record<string, unknown>)[sortBy];
    return compareValues(vx, vy, mul);
  });
}
