import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import { GeminiService, GeminiOperation } from './gemini.service';
import { AiUsageService, AI_USAGE_ENDPOINT } from './ai-usage.service';
import {
  buildSummarizePrompt,
  buildTranslatePrompt,
  buildAnalyzePrompt,
  buildGeneratePrompt,
} from './prompts';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AiResponseCacheService,
    private readonly gemini: GeminiService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async generatePrompt(aiGeneratePromptDto: AiGeneratePromptDto) {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.GENERATE);
    const userPrompt = buildGeneratePrompt(aiGeneratePromptDto);
    return this.gemini.generateContent({
      operation: GeminiOperation.Generate,
      userPrompt,
    });
  }

  async summarizeArticle(
    articleId: string,
    summarizeArticleDto: SummarizeArticleDto,
  ): Promise<SummarizeArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.SUMMARIZE);
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
      return this.toSummarizeResponse(articleId, article, cached);
    }
    const summary = await this.gemini.generateContent({
      operation: GeminiOperation.Summarize,
      userPrompt: buildSummarizePrompt(article, summarizeArticleDto),
    });
    this.cache.set(key, summary);
    return this.toSummarizeResponse(articleId, article, summary);
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
  ): Promise<TranslateArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.TRANSLATE);
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
      return { articleId, ...cached };
    }
    const rawJson = await this.gemini.generateContent({
      operation: GeminiOperation.Translate,
      userPrompt: buildTranslatePrompt(article, translateArticleDto),
      responseMimeType: 'application/json',
      responseJsonSchema: TRANSLATE_RESPONSE_JSON_SCHEMA,
    });
    const payload = this.parseTranslateModelPayload(
      rawJson,
      translateArticleDto.sourceLanguage,
    );
    this.cache.set(key, payload);
    return { articleId, ...payload };
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
  ): Promise<AnalyzeArticleResponse> {
    this.aiUsage.recordAiRequest(AI_USAGE_ENDPOINT.ANALYZE);
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundError("article doesn't exist");
    }
    const rawJson = await this.gemini.generateContent({
      operation: GeminiOperation.Analyze,
      userPrompt: buildAnalyzePrompt(article, analyzeArticleDto),
      responseMimeType: 'application/json',
      responseJsonSchema: ANALYZE_RESPONSE_JSON_SCHEMA,
    });
    const payload = this.parseAnalyzeModelPayload(rawJson);
    return { articleId, ...payload };
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
