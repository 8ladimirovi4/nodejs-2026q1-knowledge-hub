import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiResponseCacheService } from './ai-response-cache.service';
import { GeminiService } from './gemini.service';
import { AiThrottlerGuard } from './ai-throttler.guard';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiResponseCacheService,
    GeminiService,
    AiThrottlerGuard,
  ],
})
export class AiModule {}
