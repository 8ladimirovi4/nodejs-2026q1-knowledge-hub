import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiUsageService } from './ai-usage.service';

export enum GeminiOperation {
  Summarize = 'summarize',
  Translate = 'translate',
  Analyze = 'analyze',
  Generate = 'generate',
}

type GeminiPart = { text?: string };

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  prompt_token_count?: number;
  candidates_token_count?: number;
  total_token_count?: number;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsageMetadata;
};

type GeminiErrorBody = {
  error?: { code?: number; message?: string; status?: string };
};

const MAX_RETRIES = 3;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiBaseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly aiUsage: AiUsageService,
  ) {
    this.apiBaseUrl =
      this.config.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    const rawTimeout = Number(
      this.config.get<string>('GEMINI_HTTP_TIMEOUT_MS'),
    );
    this.timeoutMs =
      Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 120_000;
  }

  async generateContent(options: {
    operation: GeminiOperation;
    userPrompt: string;
    responseMimeType?: 'text/plain' | 'application/json';
    responseJsonSchema?: Record<string, unknown>;
  }): Promise<string> {
    if (!this.apiKey.trim()) {
      throw new HttpException(
        'AI provider is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const mimeType = options.responseMimeType ?? 'text/plain';
    const generationConfig: Record<string, unknown> = {
      temperature: 0.4,
      responseMimeType: mimeType,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    };
    if (mimeType === 'application/json' && options.responseJsonSchema) {
      generationConfig.responseJsonSchema = options.responseJsonSchema;
    }

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig,
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.postGenerateContentOnce(body, options.operation, {
          enforceCompleteJson: mimeType === 'application/json',
        });
      } catch (err) {
        if (!(err instanceof HttpException)) {
          throw err;
        }
        const status = err.getStatus();
        const shouldRetry =
          (status === HttpStatus.TOO_MANY_REQUESTS ||
            status === HttpStatus.SERVICE_UNAVAILABLE) &&
          attempt < MAX_RETRIES;

        if (!shouldRetry) {
          if (
            status === HttpStatus.TOO_MANY_REQUESTS &&
            attempt >= MAX_RETRIES
          ) {
            throw new HttpException(
              'Language model rate limit exceeded after retries',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }
          throw err;
        }

        const payload = err.getResponse();
        const retryAfterSec =
          typeof payload === 'object' &&
          payload !== null &&
          'retryAfterSec' in payload
            ? (payload as { retryAfterSec?: number }).retryAfterSec
            : undefined;

        const delayMs = this.computeBackoffMs(attempt, retryAfterSec);

        this.logger.warn(
          `Gemini request retry ${attempt + 1}/${MAX_RETRIES} after ${status} (${options.operation}), delay ${delayMs}ms`,
        );
        await sleep(delayMs);
      }
    }

    throw new HttpException(
      'Language model request failed after retries',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private computeBackoffMs(attempt: number, retryAfterSec?: number): number {
    if (
      retryAfterSec !== undefined &&
      Number.isFinite(retryAfterSec) &&
      retryAfterSec > 0
    ) {
      return Math.min(retryAfterSec * 1000, 60_000);
    }
    return Math.min(1000 * 2 ** attempt, 10_000);
  }

  private buildUrl(): string {
    const base = this.apiBaseUrl.replace(/\/$/, '');
    const modelId = encodeURIComponent(this.model);
    return `${base}/v1beta/models/${modelId}:generateContent`;
  }

  private async postGenerateContentOnce(
    body: Record<string, unknown>,
    operation: GeminiOperation,
    extractOpts: { enforceCompleteJson: boolean },
  ): Promise<string> {
    const url = this.buildUrl();
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Network error calling Gemini';
      this.logger.error(
        `Gemini network/timeout (${operation}): ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new HttpException(
        'Language model service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('retry-after');
      throw this.mapGeminiFailure(response.status, json, retryAfterHeader);
    }
    const text = this.extractTextFromSuccess(json, extractOpts);
    const usage = this.normalizeUsageMetadata(json);
    if (usage) {
      this.aiUsage.recordGeminiTokens(usage);
    }
    return text;
  }

  private normalizeUsageMetadata(json: unknown):
    | {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount?: number;
      }
    | undefined {
    if (!json || typeof json !== 'object') return undefined;
    const raw = (json as GeminiGenerateResponse).usageMetadata;
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as GeminiUsageMetadata;
    const prompt =
      pickFiniteNumber(o.promptTokenCount) ??
      pickFiniteNumber(o.prompt_token_count);
    const candidates =
      pickFiniteNumber(o.candidatesTokenCount) ??
      pickFiniteNumber(o.candidates_token_count);
    const total =
      pickFiniteNumber(o.totalTokenCount) ??
      pickFiniteNumber(o.total_token_count);
    if (
      prompt === undefined &&
      candidates === undefined &&
      total === undefined
    ) {
      return undefined;
    }
    const promptTokenCount = prompt ?? 0;
    const candidatesTokenCount = candidates ?? 0;
    return {
      promptTokenCount,
      candidatesTokenCount,
      ...(total !== undefined ? { totalTokenCount: total } : {}),
    };
  }

  private mapGeminiFailure(
    status: number,
    json: unknown,
    retryAfterHeader?: string | null,
  ): HttpException {
    const msg = this.safeGeminiErrorMessage(json);

    if (status === 429) {
      let sec: number | undefined;
      if (retryAfterHeader) {
        const n = Number(retryAfterHeader);
        if (Number.isFinite(n) && n > 0) {
          sec = Math.ceil(n);
        }
      }
      sec ??= this.parseRetryAfterFromError(json);
      return new HttpException(
        {
          message: 'Upstream rate limit exceeded',
          error: 'Too Many Requests',
          retryAfterSec: sec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (status === 503 || status === 502 || status === 504) {
      return new HttpException(
        'Language model service is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (status === 401 || status === 403) {
      this.logger.error(`Gemini auth error (status ${status}): ${msg}`);
      return new HttpException(
        'AI provider authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (status >= 400 && status < 500) {
      this.logger.warn(`Gemini client error (status ${status}): ${msg}`);
      return new HttpException(
        'Invalid request to language model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.error(`Gemini server error (status ${status}): ${msg}`);
    return new HttpException(
      'Language model service error',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private parseRetryAfterFromError(json: unknown): number | undefined {
    if (!json || typeof json !== 'object') return undefined;
    const details = (json as GeminiErrorBody).error?.message;
    if (typeof details !== 'string') return undefined;
    const m = details.match(/retry in ([\d.]+)s/i);
    if (m) {
      const s = Number(m[1]);
      if (Number.isFinite(s) && s > 0) return Math.ceil(s);
    }
    return undefined;
  }

  private safeGeminiErrorMessage(json: unknown): string {
    if (!json || typeof json !== 'object') {
      return 'unknown error body';
    }
    const e = (json as GeminiErrorBody).error;
    return e?.message ?? JSON.stringify(json).slice(0, 500);
  }

  private extractTextFromSuccess(
    json: unknown,
    extractOpts?: { enforceCompleteJson?: boolean },
  ): string {
    const data = json as GeminiGenerateResponse;
    if (data.promptFeedback?.blockReason) {
      throw new HttpException(
        'Content was blocked by the language model policy',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const candidates = data.candidates;
    if (!candidates?.length) {
      throw new HttpException(
        'Empty response from language model',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const first = candidates[0];
    const parts = first?.content?.parts;
    if (!parts?.length) {
      const reason = first?.finishReason;
      throw new HttpException(
        reason
          ? `Model response finished with ${reason}`
          : 'No text in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const finishReason = first?.finishReason;
    const text = parts.map((p) => p.text ?? '').join('');
    if (!text.trim()) {
      throw new HttpException(
        'Model returned only empty text',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (extractOpts?.enforceCompleteJson && finishReason === 'MAX_TOKENS') {
      this.logger.warn('Gemini structured JSON stopped with MAX_TOKENS');
      throw new HttpException(
        'Structured model response was truncated (output token limit)',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickFiniteNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
