import { Injectable } from '@nestjs/common';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';
import { SummarizeArticleDto } from './dto/summarize-ai.dto';
import { TranslateArticleDto } from './dto/translate-ai.dto';
import { AnalyzeArticleDto } from './dto/analyze-ai.dto';
import { NotFoundError } from 'src/common/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { AiResponseCacheService } from './ai-response-cache.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AiResponseCacheService,
  ) {}

  generatePrompt(_aiGeneratePromptDto: AiGeneratePromptDto) {
    return 'This action adds a new ai response';
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
    const result = 'This action summarizes an article';
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
    const result = 'This action translates an article';
    this.cache.set(key, result);
    return result;
  }

  async analyzeArticle(
    articleId: string,
    _analyzeArticleDto: AnalyzeArticleDto,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundError("article doesn't exist");
    }
    return 'This action analyzes an article';
  }
}
