import { Injectable } from '@nestjs/common';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';
import { SummarizeArticleDto } from './dto/summarize-ai.dto';
import { TranslateArticleDto } from './dto/translate-ai.dto';
import { AnalyzeArticleDto } from './dto/analyze-ai.dto';
import { NotFoundError } from 'src/common/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { AiResponseCacheService } from './ai-response-cache.service';
import { GeminiService, GeminiOperation } from './gemini.service';
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
  ) {}

  async generatePrompt(aiGeneratePromptDto: AiGeneratePromptDto) {
    const userPrompt = buildGeneratePrompt(aiGeneratePromptDto);
    return this.gemini.generateContent({
      operation: GeminiOperation.Generate,
      userPrompt,
    });
  }

  async summarizeArticle(
    articleId: string,
    summarizeArticleDto: SummarizeArticleDto,
  ) {
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
      return cached;
    }
    const result = await this.gemini.generateContent({
      operation: GeminiOperation.Summarize,
      userPrompt: buildSummarizePrompt(article, summarizeArticleDto),
    });
    this.cache.set(key, result);
    return result;
  }

  async translateArticle(
    articleId: string,
    translateArticleDto: TranslateArticleDto,
  ) {
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
    const cached = this.cache.get<string>(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = await this.gemini.generateContent({
      operation: GeminiOperation.Translate,
      userPrompt: buildTranslatePrompt(article, translateArticleDto),
    });
    this.cache.set(key, result);
    return result;
  }

  async analyzeArticle(
    articleId: string,
    analyzeArticleDto: AnalyzeArticleDto,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundError("article doesn't exist");
    }
    return this.gemini.generateContent({
      operation: GeminiOperation.Analyze,
      userPrompt: buildAnalyzePrompt(article, analyzeArticleDto),
    });
  }
}
