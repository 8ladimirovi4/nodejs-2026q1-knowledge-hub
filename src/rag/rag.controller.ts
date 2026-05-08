import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RagIndexingService } from './rag-reindex.service';
import { RagReIndexDto } from './dto/rag-reindex.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagRetrievalService } from './rag-retrieval.service';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagChatService } from './rag-chat.service';
import { RagConversationService } from './rag-conversation.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly reIndexService: RagIndexingService,
    private readonly retrievalService: RagRetrievalService,
    private readonly chatService: RagChatService,
    private readonly conversation: RagConversationService,
  ) {}

  @Get('chat/:conversationId/history')
  history(@Param('id') id: string) {
    return this.conversation.getHistory(id);
  }

  @Post('index')
  @HttpCode(HttpStatus.OK)
  create(@Body() dto: RagReIndexDto) {
    return this.reIndexService.createVectorIndex(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() dto: RagSearchDto) {
    return this.retrievalService.searchRetrieval(dto);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@Body() dto: RagChatDto) {
    return this.chatService.ragChat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.reIndexService.removeArticleFromIndex(id);
  }
}
