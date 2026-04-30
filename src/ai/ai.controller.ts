import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SummarizeArticleDto } from './dto/summarize-ai.dto';
import { TranslateArticleDto } from './dto/translate-ai.dto';
import { AnalyzeArticleDto } from './dto/analyze-ai.dto';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';

@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generatePrompt(@Body() aiGeneratePromptDto: AiGeneratePromptDto) {
    return this.aiService.generatePrompt(aiGeneratePromptDto);
  }

  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  summarizeArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() summarizeArticleDto: SummarizeArticleDto,
  ) {
    return this.aiService.summarizeArticle(articleId, summarizeArticleDto);
  }

  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  translateArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() translateArticleDto: TranslateArticleDto,
  ) {
    return this.aiService.translateArticle(articleId, translateArticleDto);
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  analyzeArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() analyzeArticleDto: AnalyzeArticleDto,
  ) {
    return this.aiService.analyzeArticle(articleId, analyzeArticleDto);
  }
}
