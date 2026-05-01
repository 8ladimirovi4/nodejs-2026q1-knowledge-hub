import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { AiService } from './ai.service';
import { AiUsageService, type AiUsageSnapshot } from './ai-usage.service';
import { AiUsageResponseDto } from './dto/ai-usage.dto';
import { SummarizeArticleDto } from './dto/summarize-ai.dto';
import { TranslateArticleDto } from './dto/translate-ai.dto';
import { AnalyzeArticleDto } from './dto/analyze-ai.dto';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';

@ApiBearerAuth('access-token')
@SkipThrottle({ auth: true })
@UseGuards(AiThrottlerGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiUsage: AiUsageService,
  ) {}

  @Get('usage')
  @SkipThrottle({ auth: true, ai: true })
  @ApiOperation({ summary: 'AI usage counters since process start' })
  @ApiOkResponse({ type: AiUsageResponseDto })
  getUsage(): AiUsageSnapshot {
    return this.aiUsage.getSnapshot();
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
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
