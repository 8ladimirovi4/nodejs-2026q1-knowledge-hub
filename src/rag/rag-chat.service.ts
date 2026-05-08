import { Injectable } from '@nestjs/common';
import { RagChatDto } from './dto/rag-chat.dto';

@Injectable()
export class RagChatService {
  ragChat(_dto: RagChatDto) {
    return 'rag chat response';
  }
}
