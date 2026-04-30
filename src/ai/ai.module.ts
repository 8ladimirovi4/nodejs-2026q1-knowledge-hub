import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiResponseCacheService } from './ai-response-cache.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiResponseCacheService],
})
export class AiModule {}
