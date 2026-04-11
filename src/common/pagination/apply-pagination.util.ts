import { BadRequestException } from '@nestjs/common';

export type PaginatedList<T> = {
  total: number;
  page: number;
  limit: number;
  data: T[];
};

const DEFAULT_MAX_LIMIT = 100;

function isProvided(v: string | undefined): boolean {
  return v !== undefined && String(v).trim() !== '';
}

export function applyOptionalPagination<T>(
  items: T[],
  page?: string,
  limit?: string,
  maxLimit = DEFAULT_MAX_LIMIT,
): T[] | PaginatedList<T> {
  const hasPage = isProvided(page);
  const hasLimit = isProvided(limit);
  if (!hasPage && !hasLimit) {
    return items;
  }
  if (hasPage !== hasLimit) {
    throw new BadRequestException(
      'Pagination requires both page and limit query parameters',
    );
  }
  const pageNum = Number.parseInt(String(page).trim(), 10);
  const limitNum = Number.parseInt(String(limit).trim(), 10);
  if (
    !Number.isInteger(pageNum) ||
    pageNum < 1 ||
    !Number.isInteger(limitNum) ||
    limitNum < 1 ||
    limitNum > maxLimit
  ) {
    throw new BadRequestException();
  }
  const total = items.length;
  const start = (pageNum - 1) * limitNum;
  const data = items.slice(start, start + limitNum);
  return { total, page: pageNum, limit: limitNum, data };
}
