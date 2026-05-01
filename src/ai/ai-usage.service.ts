import { Injectable } from '@nestjs/common';
import type { GeminiOperation } from './gemini-operation';

export const AI_USAGE_ENDPOINT = {
  GENERATE: 'POST /ai/generate',
  SUMMARIZE: 'POST /ai/articles/:articleId/summarize',
  TRANSLATE: 'POST /ai/articles/:articleId/translate',
  ANALYZE: 'POST /ai/articles/:articleId/analyze',
} as const;

export type AiUsageEndpointLabel =
  (typeof AI_USAGE_ENDPOINT)[keyof typeof AI_USAGE_ENDPOINT];

type LatencyAcc = { count: number; totalMs: number; maxMs: number };

export type LatencyStatSnapshot = {
  count: number;
  avgMs: number;
  maxMs: number;
};

export type CacheRatioSnapshot = {
  hits: number;
  misses: number;
  hitRatio: number | null;
};

export type AiDiagnosticEvent = {
  traceId: string;
  endpoint: string;
  totalMs: number;
  geminiMs: number | null;
  cache: 'hit' | 'miss' | 'n/a';
  outcome: 'ok' | 'not_found' | 'error';
  at: string;
};

export type AiUsageSnapshot = {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  tokens?: {
    prompt: number;
    candidates: number;
    total: number;
  };
  latency: {
    byEndpoint: Record<string, LatencyStatSnapshot>;
    geminiByOperation: Record<string, LatencyStatSnapshot>;
  };
  cache: {
    summarize: CacheRatioSnapshot;
    translate: CacheRatioSnapshot;
  };
  diagnostics: {
    recentEvents: AiDiagnosticEvent[];
    maxEvents: number;
  };
};

const DIAGNOSTIC_BUFFER_MAX = 30;

function emptyAcc(): LatencyAcc {
  return { count: 0, totalMs: 0, maxMs: 0 };
}

function bumpLatency(acc: LatencyAcc, ms: number): void {
  acc.count += 1;
  acc.totalMs += ms;
  acc.maxMs = Math.max(acc.maxMs, ms);
}

function accToSnapshot(acc: LatencyAcc): LatencyStatSnapshot {
  return {
    count: acc.count,
    avgMs: acc.count > 0 ? Math.round(acc.totalMs / acc.count) : 0,
    maxMs: acc.maxMs,
  };
}

function ratio(hits: number, misses: number): number | null {
  const total = hits + misses;
  if (total === 0) return null;
  return Math.round((10000 * hits) / total) / 10000;
}

@Injectable()
export class AiUsageService {
  private readonly requestsByEndpoint = new Map<string, number>();
  private readonly endpointWallMs = new Map<string, LatencyAcc>();
  private readonly geminiWallMs = new Map<string, LatencyAcc>();
  private promptTokens = 0;
  private candidatesTokens = 0;
  private combinedTotalTokens = 0;
  private tokenEvents = 0;
  private summarizeHits = 0;
  private summarizeMisses = 0;
  private translateHits = 0;
  private translateMisses = 0;
  private readonly diagnosticBuffer: AiDiagnosticEvent[] = [];

  recordAiRequest(endpoint: AiUsageEndpointLabel): void {
    this.requestsByEndpoint.set(
      endpoint,
      (this.requestsByEndpoint.get(endpoint) ?? 0) + 1,
    );
  }

  recordEndpointWallTime(endpoint: AiUsageEndpointLabel, ms: number): void {
    let acc = this.endpointWallMs.get(endpoint);
    if (!acc) {
      acc = emptyAcc();
      this.endpointWallMs.set(endpoint, acc);
    }
    bumpLatency(acc, ms);
  }

  recordGeminiRoundTrip(operation: GeminiOperation, ms: number): void {
    const key = String(operation);
    let acc = this.geminiWallMs.get(key);
    if (!acc) {
      acc = emptyAcc();
      this.geminiWallMs.set(key, acc);
    }
    bumpLatency(acc, ms);
  }

  recordSummarizeCacheHit(hit: boolean): void {
    if (hit) this.summarizeHits += 1;
    else this.summarizeMisses += 1;
  }

  recordTranslateCacheHit(hit: boolean): void {
    if (hit) this.translateHits += 1;
    else this.translateMisses += 1;
  }

  recordDiagnostic(event: Omit<AiDiagnosticEvent, 'at'>): void {
    const full: AiDiagnosticEvent = {
      ...event,
      at: new Date().toISOString(),
    };
    this.diagnosticBuffer.push(full);
    if (this.diagnosticBuffer.length > DIAGNOSTIC_BUFFER_MAX) {
      this.diagnosticBuffer.splice(
        0,
        this.diagnosticBuffer.length - DIAGNOSTIC_BUFFER_MAX,
      );
    }
  }

  recordGeminiTokens(usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount?: number;
  }): void {
    const p = usage.promptTokenCount;
    const c = usage.candidatesTokenCount;
    const t = usage.totalTokenCount;
    this.promptTokens += p;
    this.candidatesTokens += c;
    this.combinedTotalTokens +=
      t !== undefined && Number.isFinite(t) ? t : p + c;
    this.tokenEvents += 1;
  }

  getSnapshot(): AiUsageSnapshot {
    const requestsByEndpoint: Record<string, number> = {};
    const sortedKeys = [...this.requestsByEndpoint.keys()].sort((a, b) =>
      a.localeCompare(b),
    );
    for (const k of sortedKeys) {
      requestsByEndpoint[k] = this.requestsByEndpoint.get(k) ?? 0;
    }
    const totalRequests = sortedKeys.reduce(
      (acc, k) => acc + (this.requestsByEndpoint.get(k) ?? 0),
      0,
    );

    const byEndpoint: Record<string, LatencyStatSnapshot> = {};
    const wallKeys = [...this.endpointWallMs.keys()].sort((a, b) =>
      a.localeCompare(b),
    );
    for (const k of wallKeys) {
      byEndpoint[k] = accToSnapshot(this.endpointWallMs.get(k)!);
    }

    const geminiByOperation: Record<string, LatencyStatSnapshot> = {};
    const gemKeys = [...this.geminiWallMs.keys()].sort((a, b) =>
      a.localeCompare(b),
    );
    for (const k of gemKeys) {
      geminiByOperation[k] = accToSnapshot(this.geminiWallMs.get(k)!);
    }

    const snapshot: AiUsageSnapshot = {
      totalRequests,
      requestsByEndpoint,
      latency: { byEndpoint, geminiByOperation },
      cache: {
        summarize: {
          hits: this.summarizeHits,
          misses: this.summarizeMisses,
          hitRatio: ratio(this.summarizeHits, this.summarizeMisses),
        },
        translate: {
          hits: this.translateHits,
          misses: this.translateMisses,
          hitRatio: ratio(this.translateHits, this.translateMisses),
        },
      },
      diagnostics: {
        recentEvents: [...this.diagnosticBuffer],
        maxEvents: DIAGNOSTIC_BUFFER_MAX,
      },
    };

    if (this.tokenEvents > 0) {
      snapshot.tokens = {
        prompt: this.promptTokens,
        candidates: this.candidatesTokens,
        total: this.combinedTotalTokens,
      };
    }
    return snapshot;
  }
}
