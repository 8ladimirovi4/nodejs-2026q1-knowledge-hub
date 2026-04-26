import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function ApiOptionalListQueries() {
  return applyDecorators(
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      description: 'Sort by field name (resource-specific allowlist)',
    }),
    ApiQuery({
      name: 'order',
      required: false,
      enum: ['asc', 'desc'],
      description: 'Sort direction (default asc when sortBy is set)',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-based); use together with limit',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Page size; use together with page',
    }),
  );
}
