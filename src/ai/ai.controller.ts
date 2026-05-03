import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { AiService } from './ai.service';
import { AiUsageService, type AiUsageSnapshot } from './ai-usage.service';
import {
  AiUsageResponseDto,
  LatencyStatDto,
} from './dto/ai-usage.dto';
import { SummarizeArticleDto } from './dto/summarize-ai.dto';
import { TranslateArticleDto } from './dto/translate-ai.dto';
import { AnalyzeArticleDto } from './dto/analyze-ai.dto';
import { AiGeneratePromptDto } from './dto/generate-ai.dto';
import { AiGeneratePromptResponseDto } from './dto/generate-ai-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';

@ApiBearerAuth('access-token')
@ApiExtraModels(LatencyStatDto)
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
  @ApiOkResponse({ type: AiGeneratePromptResponseDto })
  @ApiOperation({
    summary:
      'Free-form generation with short-term conversation memory per sessionId',
  })
  generatePrompt(
    @Body() aiGeneratePromptDto: AiGeneratePromptDto,
    @CurrentUser() actor: JwtAccessPayload,
    @Req() req: Request,
  ) {
    const traceId = req.traceId ?? 'unknown';
    return this.aiService.generatePrompt(aiGeneratePromptDto, actor, traceId);
  }

  @Post('articles/:articleId/summarize')
  @HttpCode(HttpStatus.OK)
  summarizeArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() summarizeArticleDto: SummarizeArticleDto,
    @Req() req: Request,
  ) {
    const traceId = req.traceId ?? 'unknown';
    return this.aiService.summarizeArticle(
      articleId,
      summarizeArticleDto,
      traceId,
    );
  }

  @Post('articles/:articleId/translate')
  @HttpCode(HttpStatus.OK)
  translateArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() translateArticleDto: TranslateArticleDto,
    @Req() req: Request,
  ) {
    const traceId = req.traceId ?? 'unknown';
    return this.aiService.translateArticle(
      articleId,
      translateArticleDto,
      traceId,
    );
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(HttpStatus.OK)
  analyzeArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() analyzeArticleDto: AnalyzeArticleDto,
    @Req() req: Request,
  ) {
    const traceId = req.traceId ?? 'unknown';
    return this.aiService.analyzeArticle(articleId, analyzeArticleDto, traceId);
  }
}
