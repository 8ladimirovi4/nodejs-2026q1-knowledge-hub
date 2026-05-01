import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';
import {
  SummarizeArticleDto,
  SummarizeArticleResponse,
} from './dto/summarize-ai.dto';
import {
  TranslateArticleDto,
  TranslateArticleModelPayload,
  TranslateArticleResponse,
  TRANSLATE_RESPONSE_JSON_SCHEMA,
} from './dto/translate-ai.dto';
import {
  AnalyzeArticleDto,
  AnalyzeArticleModelPayload,
  AnalyzeArticleResponse,
  AnalyzeArticleSeverity,
  ANALYZE_RESPONSE_JSON_SCHEMA,
} from './dto/analyze-ai.dto';
import { NotFoundError } from 'src/common/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { AiResponseCacheService } from './ai-response-cache.service';
import { GeminiService } from './gemini.service';
import { GeminiOperation } from './gemini-operation';
import {
  AiUsageService,
  AI_USAGE_ENDPOINT,
  type AiUsageEndpointLabel,
} from './ai-usage.service';
import {
  buildSummarizePrompt,
  buildTranslatePrompt,
  buildAnalyzePrompt,
  buildGeneratePrompt,
} from './prompts';

type AiObservabilityState = {
  geminiMs: number | null;
  cache: 'hit' | 'miss' | 'n/a';
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AiResponseCacheService,
    private readonly gemini: GeminiService,
    private readonly aiUsage: AiUsageService,
  ) {}

  private async runObservedAi<T>(
    endpoint: AiUsageEndpointLabel,
    traceId: string,
    meta: { articleId?: string },
    run: (o: AiObservabilityState) => Promise<T>,
  ): Promise<T> {
    const o: AiObservabilityState = { geminiMs: null, cache: 'n/a' };
    const wallStart = Date.now();
    let outcome: 'ok' | 'not_found' | 'error' = 'ok';
    try {
      return await run(o);
    } catch (e) {
      outcome = e instanceof NotFoundError ? 'not_found' : 'error';
      throw e;
    } finally {
      const totalMs = Date.now() - wallStart;
      this.aiUsage.recordEndpointWallTime(endpoint, totalMs);
      this.aiUsage.recordDiagnostic({
        traceId,
        endpoint,
        totalMs,
        geminiMs: o.geminiMs,
        cache: o.cache,
        outcome,
      });
      const logPayload: Record<string, unknown> = {
        context: 'AI',
        traceId,
        endpoint,
        totalMs,
        geminiMs: o.geminiMs,
        cache: o.cache,
        outcome,
      };
      if (meta.articleId !== undefined) {
        logPayload.articleId = meta.articleId;
      }
      this.logger.log(JSON.stringify(logPayload));
    }
  }

  async generatePrompt(
    aiGeneratePromptDto: AiGeneratePromptDto,
    traceId: string,
  ): Promise<string> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.GENERATE);
    return this.runObservedAi(
      AI_USAGE_ENDPOINT.GENERATE,
      traceId,
      {},
      async (o) => {
        const userPrompt = buildGeneratePrompt(aiGeneratePromptDto);
        const { text, durationMs } = await this.gemini.generateContent({
          operation: GeminiOperation.Generate,
          userPrompt,
          traceId,
        });
        o.geminiMs = durationMs;
        return text;
      },
    );
  }

  async summarizeArticle(
    articleId: string,
    summarizeArticleDto: SummarizeArticleDto,
    traceId: string,
  ): Promise<SummarizeArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.SUMMARIZE);
    return this.runObservedAi(
      AI_USAGE_ENDPOINT.SUMMARIZE,
      traceId,
      { articleId },
      async (o) => {
        const article = await this.prisma.article.findUnique({
          where: { id: articleId },
        });
        if (!article) {
          throw new NotFoundError("article doesn't exist");
        }
        const key = this.cache.summarizeKey(
          articleId,
          article.updatedAt,
          summarizeArticleDto.maxLength,
        );
        const cached = this.cache.get<string>(key);
        if (cached !== undefined) {
          o.cache = 'hit';
          this.aiUsage.recordSummarizeCacheHit(true);
          return this.toSummarizeResponse(articleId, article, cached);
        }
        this.aiUsage.recordSummarizeCacheHit(false);
        o.cache = 'miss';
        const { text, durationMs } = await this.gemini.generateContent({
          operation: GeminiOperation.Summarize,
          userPrompt: buildSummarizePrompt(article, summarizeArticleDto),
          traceId,
        });
        o.geminiMs = durationMs;
        this.cache.set(key, text);
        return this.toSummarizeResponse(articleId, article, text);
      },
    );
  }

  private toSummarizeResponse(
    articleId: string,
    article: { title: string; content: string },
    summary: string,
  ): SummarizeArticleResponse {
    const originalText = `${article.title}\n\n${article.content}`;
    return {
      articleId,
      summary,
      originalLength: originalText.length,
      summaryLength: summary.length,
    };
  }

  async translateArticle(
    articleId: string,
    translateArticleDto: TranslateArticleDto,
    traceId: string,
  ): Promise<TranslateArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.TRANSLATE);
    return this.runObservedAi(
      AI_USAGE_ENDPOINT.TRANSLATE,
      traceId,
      { articleId },
      async (o) => {
        const article = await this.prisma.article.findUnique({
          where: { id: articleId },
        });
        if (!article) {
          throw new NotFoundError("article doesn't exist");
        }
        const key = this.cache.translateKey(
          articleId,
          article.updatedAt,
          translateArticleDto.targetLanguage,
          translateArticleDto.sourceLanguage,
        );
        const cached = this.cache.get<TranslateArticleModelPayload>(key);
        if (cached !== undefined) {
          o.cache = 'hit';
          this.aiUsage.recordTranslateCacheHit(true);
          return { articleId, ...cached };
        }
        this.aiUsage.recordTranslateCacheHit(false);
        o.cache = 'miss';
        const { text: rawJson, durationMs } = await this.gemini.generateContent(
          {
            operation: GeminiOperation.Translate,
            userPrompt: buildTranslatePrompt(article, translateArticleDto),
            responseMimeType: 'application/json',
            responseJsonSchema: TRANSLATE_RESPONSE_JSON_SCHEMA,
            traceId,
          },
        );
        o.geminiMs = durationMs;
        const payload = this.parseTranslateModelPayload(
          rawJson,
          translateArticleDto.sourceLanguage,
        );
        this.cache.set(key, payload);
        return { articleId, ...payload };
      },
    );
  }

  private parseTranslateModelPayload(
    raw: string,
    explicitSourceLanguage?: string,
  ): TranslateArticleModelPayload {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new HttpException(
        'Invalid translation response from language model',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!data || typeof data !== 'object') {
      throw new HttpException(
        'Invalid translation response from language model',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const o = data as Record<string, unknown>;
    const translatedText = o.translatedText;
    const detectedLang = o.detectedLanguage;
    if (typeof translatedText !== 'string' || !translatedText.trim()) {
      throw new HttpException(
        'Translation text missing in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (typeof detectedLang !== 'string' || !detectedLang.trim()) {
      throw new HttpException(
        'Detected language missing in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const detectedLanguage = explicitSourceLanguage?.trim()
      ? explicitSourceLanguage.trim()
      : detectedLang.trim();
    return {
      translatedText: translatedText.trim(),
      detectedLanguage,
    };
  }

  async analyzeArticle(
    articleId: string,
    analyzeArticleDto: AnalyzeArticleDto,
    traceId: string,
  ): Promise<AnalyzeArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.ANALYZE);
    return this.runObservedAi(
      AI_USAGE_ENDPOINT.ANALYZE,
      traceId,
      { articleId },
      async (o) => {
        const article = await this.prisma.article.findUnique({
          where: { id: articleId },
        });
        if (!article) {
          throw new NotFoundError("article doesn't exist");
        }
        const { text: rawJson, durationMs } = await this.gemini.generateContent(
          {
            operation: GeminiOperation.Analyze,
            userPrompt: buildAnalyzePrompt(article, analyzeArticleDto),
            responseMimeType: 'application/json',
            responseJsonSchema: ANALYZE_RESPONSE_JSON_SCHEMA,
            traceId,
          },
        );
        o.geminiMs = durationMs;
        const payload = this.parseAnalyzeModelPayload(rawJson);
        return { articleId, ...payload };
      },
    );
  }

  private parseAnalyzeModelPayload(raw: string): AnalyzeArticleModelPayload {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new HttpException(
        'Invalid analysis response from language model',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!data || typeof data !== 'object') {
      throw new HttpException(
        'Invalid analysis response from language model',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const o = data as Record<string, unknown>;
    const analysis = o.analysis;
    const suggestionsRaw = o.suggestions;
    const severityRaw = o.severity;

    if (typeof analysis !== 'string' || !analysis.trim()) {
      throw new HttpException(
        'Analysis text missing in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (!Array.isArray(suggestionsRaw)) {
      throw new HttpException(
        'Suggestions missing or invalid in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const suggestions = suggestionsRaw
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter(Boolean);

    if (
      typeof severityRaw !== 'string' ||
      !(
        severityRaw === AnalyzeArticleSeverity.INFO ||
        severityRaw === AnalyzeArticleSeverity.WARNING ||
        severityRaw === AnalyzeArticleSeverity.ERROR
      )
    ) {
      throw new HttpException(
        'Severity missing or invalid in model response',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return {
      analysis: analysis.trim(),
      suggestions,
      severity: severityRaw,
    };
  }
}
