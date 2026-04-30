import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SummarizeArticleMaxLength } from './dto/summarize-ai.dto';

type CacheEntry<T> = { value: T; expiresAtMs: number };

@Injectable()
export class AiResponseCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;

  constructor(private readonly config: ConfigService) {
    const sec = Number(this.config.get<string>('AI_CACHE_TTL_SEC') ?? '300');
    this.ttlMs = Number.isFinite(sec) && sec > 0 ? sec * 1000 : 300_000;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAtMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.ttlMs;
    this.store.set(key, {
      value,
      expiresAtMs: Date.now() + ttl,
    });
  }

  summarizeKey(
    articleId: string,
    articleUpdatedAt: Date,
    maxLength: SummarizeArticleMaxLength | undefined,
  ): string {
    const effective = maxLength ?? SummarizeArticleMaxLength.MEDIUM;
    return this.stableKey('summarize', articleId, articleUpdatedAt, {
      maxLength: effective,
    });
  }

  translateKey(
    articleId: string,
    articleUpdatedAt: Date,
    targetLanguage: string,
    sourceLanguage: string | undefined,
  ): string {
    return this.stableKey('translate', articleId, articleUpdatedAt, {
      targetLanguage,
      ...(sourceLanguage !== undefined ? { sourceLanguage } : {}),
    });
  }

  private stableKey(
    operation: string,
    articleId: string,
    articleUpdatedAt: Date,
    params: Record<string, string>,
  ): string {
    const updatedAtIso = articleUpdatedAt.toISOString();
    const sortedKeys = Object.keys(params).sort();
    const paramsPart = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');
    return `${operation}:${articleId}:${updatedAtIso}:${paramsPart}`;
  }
}
