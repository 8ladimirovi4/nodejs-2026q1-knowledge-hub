import { Injectable } from '@nestjs/common';

export const AI_USAGE_ENDPOINT = {
  GENERATE: 'POST /ai/generate',
  SUMMARIZE: 'POST /ai/articles/:articleId/summarize',
  TRANSLATE: 'POST /ai/articles/:articleId/translate',
  ANALYZE: 'POST /ai/articles/:articleId/analyze',
} as const;

export type AiUsageEndpointLabel =
  (typeof AI_USAGE_ENDPOINT)[keyof typeof AI_USAGE_ENDPOINT];

export type AiUsageSnapshot = {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  tokens?: {
    prompt: number;
    candidates: number;
    total: number;
  };
};

@Injectable()
export class AiUsageService {
  private readonly requestsByEndpoint = new Map<string, number>();
  private promptTokens = 0;
  private candidatesTokens = 0;
  private combinedTotalTokens = 0;
  private tokenEvents = 0;

  recordAiRequest(endpoint: AiUsageEndpointLabel): void {
    this.requestsByEndpoint.set(
      endpoint,
      (this.requestsByEndpoint.get(endpoint) ?? 0) + 1,
    );
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
    const snapshot: AiUsageSnapshot = { totalRequests, requestsByEndpoint };
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
