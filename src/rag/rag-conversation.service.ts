import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type RagConversationRole = 'user' | 'model';

export type RagConversationTurn = {
  role: RagConversationRole;
  text: string;
};

type SessionBucket = {
  turns: RagConversationTurn[];
};

@Injectable()
export class RagConversationService {
  private readonly store = new Map<string, SessionBucket>();

  constructor(private readonly config: ConfigService) {}

  mintConversationId(): string {
    return randomUUID();
  }

  private getMaxMessages(): number {
    const raw = Number(
      this.config.get<string>('RAG_CONVERSATION_MAX_MESSAGES'),
    );
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 20;
  }

  private bucketForConversation(conversationId: string): SessionBucket {
    const existing = this.store.get(conversationId);
    if (existing) {
      return existing;
    }

    const created: SessionBucket = { turns: [] };
    this.store.set(conversationId, created);
    return created;
  }

  private trimToMaxMessages(
    turns: RagConversationTurn[],
  ): RagConversationTurn[] {
    const maxMessages = this.getMaxMessages();
    if (turns.length <= maxMessages) {
      return turns;
    }
    return turns.slice(-maxMessages);
  }

  getPriorGeminiContents(
    conversationId: string,
  ): Array<{ role: RagConversationRole; parts: { text: string }[] }> {
    const bucket = this.bucketForConversation(conversationId);
    const trimmed = this.trimToMaxMessages(bucket.turns);

    return trimmed.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    }));
  }

  appendSuccessfulExchange(
    conversationId: string,
    userText: string,
    modelText: string,
  ): void {
    const bucket = this.bucketForConversation(conversationId);
    bucket.turns.push(
      { role: 'user', text: userText },
      { role: 'model', text: modelText },
    );
    bucket.turns = this.trimToMaxMessages(bucket.turns);
  }

  getHistory(conversationId: string) {
    const bucket = this.bucketForConversation(conversationId);
    bucket.turns = this.trimToMaxMessages(bucket.turns);
    return {
      conversationId,
      messages: bucket.turns,
    };
  }
}
