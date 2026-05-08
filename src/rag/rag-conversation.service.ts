import { Injectable } from '@nestjs/common';

@Injectable()
export class RagConversationService {
  getHistory(_id: string) {
    return 'history';
  }
}
