import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiResponseCacheService } from './ai-response-cache.service';
import { GeminiService } from './gemini.service';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { AiUsageService } from './ai-usage.service';
import { AiConversationMemoryService } from './ai-conversation-memory.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiResponseCacheService,
    AiUsageService,
    AiConversationMemoryService,
    GeminiService,
    AiThrottlerGuard,
  ],
})
export class AiModule {}
