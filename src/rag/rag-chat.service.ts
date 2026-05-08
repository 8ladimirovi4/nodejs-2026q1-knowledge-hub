import { Injectable } from '@nestjs/common';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagConversationService } from './rag-conversation.service';

@Injectable()
export class RagChatService {
  constructor(private readonly conversation: RagConversationService) {}

  ragChat(_dto: RagChatDto) {
    return 'rag chat response';
  }

  getHistory(conversationId: string) {
    return this.conversation.getHistory(conversationId);
  }
}
