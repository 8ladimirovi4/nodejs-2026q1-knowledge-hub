import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiUsageTokensDto {
  @ApiProperty({ example: 1200 })
  prompt: number;

  @ApiProperty({ example: 340 })
  candidates: number;

  @ApiProperty({ example: 1540 })
  total: number;
}

export class LatencyStatDto {
  @ApiProperty({ example: 12 })
  count: number;

  @ApiProperty({ example: 842 })
  avgMs: number;

  @ApiProperty({ example: 3200 })
  maxMs: number;
}

export class AiUsageLatencyDto {
  @ApiProperty({
    description: 'Wall-clock latency per AI HTTP endpoint (handler).',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/LatencyStatDto' },
  })
  byEndpoint: Record<string, LatencyStatDto>;

  @ApiProperty({
    description:
      'Gemini generateContent round-trip (includes retries/backoff).',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/LatencyStatDto' },
  })
  geminiByOperation: Record<string, LatencyStatDto>;
}

export class CacheRatioDto {
  @ApiProperty({ example: 4 })
  hits: number;

  @ApiProperty({ example: 1 })
  misses: number;

  @ApiPropertyOptional({ example: 0.8, nullable: true })
  hitRatio: number | null;
}

export class AiCacheStatsDto {
  @ApiProperty({ type: CacheRatioDto })
  summarize: CacheRatioDto;

  @ApiProperty({ type: CacheRatioDto })
  translate: CacheRatioDto;
}

export class AiDiagnosticEventDto {
  @ApiProperty()
  traceId: string;

  @ApiProperty()
  endpoint: string;

  @ApiProperty()
  totalMs: number;

  @ApiPropertyOptional({ nullable: true })
  geminiMs: number | null;

  @ApiProperty({ enum: ['hit', 'miss', 'n/a'] })
  cache: 'hit' | 'miss' | 'n/a';

  @ApiProperty({ enum: ['ok', 'not_found', 'error'] })
  outcome: 'ok' | 'not_found' | 'error';

  @ApiProperty({ example: '2026-05-01T12:00:00.000Z' })
  at: string;
}

export class AiDiagnosticsDto {
  @ApiProperty({ type: [AiDiagnosticEventDto] })
  recentEvents: AiDiagnosticEventDto[];

  @ApiProperty({ example: 30 })
  maxEvents: number;
}

export class AiUsageResponseDto {
  @ApiProperty({ example: 42 })
  totalRequests: number;

  @ApiProperty({
    example: {
      'POST /ai/generate': 1,
      'POST /ai/articles/:articleId/summarize': 10,
    },
  })
  requestsByEndpoint: Record<string, number>;

  @ApiPropertyOptional({ type: AiUsageTokensDto })
  tokens?: AiUsageTokensDto;

  @ApiProperty({ type: AiUsageLatencyDto })
  latency: AiUsageLatencyDto;

  @ApiProperty({ type: AiCacheStatsDto })
  cache: AiCacheStatsDto;

  @ApiProperty({ type: AiDiagnosticsDto })
  diagnostics: AiDiagnosticsDto;
}
