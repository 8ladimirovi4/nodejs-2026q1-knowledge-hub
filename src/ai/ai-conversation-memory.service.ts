import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export type ConversationTurnRole = 'user' | 'model';

export type ConversationTurn = {
  role: ConversationTurnRole;
  text: string;
};

type GeminiContentMessage = {
  role: ConversationTurnRole;
  parts: { text: string }[];
};

type SessionBucket = {
  turns: ConversationTurn[];
  lastActivityAt: number;
};

@Injectable()
export class AiConversationMemoryService {
  private readonly store = new Map<string, SessionBucket>();

  constructor(private readonly config: ConfigService) {}

  mintSessionId(): string {
    return randomUUID();
  }

  private turnKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private getMaxPairs(): number {
    const raw = Number(this.config.get<string>('AI_CONVERSATION_MAX_PAIRS'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10;
  }

  private getIdleTtlMs(): number {
    const raw = Number(this.config.get<string>('AI_CONVERSATION_IDLE_TTL_SEC'));
    const sec = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 900;
    return sec * 1000;
  }

  private bucketForSession(userId: string, sessionId: string): SessionBucket {
    const key = this.turnKey(userId, sessionId);
    const ttlMs = this.getIdleTtlMs();
    const now = Date.now();
    const existing = this.store.get(key);
    if (existing) {
      if (now - existing.lastActivityAt > ttlMs) {
        const cleared: SessionBucket = { turns: [], lastActivityAt: now };
        this.store.set(key, cleared);
        return cleared;
      }
      existing.lastActivityAt = now;
      return existing;
    }
    const created: SessionBucket = { turns: [], lastActivityAt: now };
    this.store.set(key, created);
    return created;
  }

  trimToMaxPairs(turns: ConversationTurn[]): ConversationTurn[] {
    const maxPairs = this.getMaxPairs();
    const cap = maxPairs * 2;
    if (turns.length <= cap) {
      return turns;
    }
    return turns.slice(-cap);
  }

  getPriorGeminiContents(
    userId: string,
    sessionId: string,
  ): GeminiContentMessage[] {
    const bucket = this.bucketForSession(userId, sessionId);
    const trimmed = this.trimToMaxPairs(bucket.turns);
    return trimmed.map((t) => ({
      role: t.role,
      parts: [{ text: t.text }],
    }));
  }

  appendSuccessfulExchange(
    userId: string,
    sessionId: string,
    userText: string,
    modelText: string,
  ): void {
    const bucket = this.bucketForSession(userId, sessionId);
    bucket.turns.push(
      { role: 'user', text: userText },
      { role: 'model', text: modelText },
    );
    bucket.turns = this.trimToMaxPairs(bucket.turns);
    bucket.lastActivityAt = Date.now();
  }
}
