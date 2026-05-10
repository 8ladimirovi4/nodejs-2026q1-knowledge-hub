import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiOperation, GeminiService } from 'src/ai/gemini.service';
import { RagChatDto } from './dto/rag-chat.dto';
import {
  buildRagChatPrompt,
  type RagChatPromptSource,
} from './promts/rag-chat.prompt';
import { RagConversationService } from './rag-conversation.service';
import { RagRetrievalService } from './rag-retrieval.service';

type RagChatSource = RagChatPromptSource;

type RagChatResponse = {
  answer: string;
  sources: RagChatSource[];
  conversationId: string;
};

@Injectable()
export class RagChatService {
  constructor(
    private readonly retrieval: RagRetrievalService,
    private readonly conversation: RagConversationService,
    private readonly gemini: GeminiService,
    private readonly config: ConfigService,
  ) {}

  async ragChat(dto: RagChatDto): Promise<RagChatResponse> {
    const conversationId =
      dto.conversationId ?? this.conversation.mintConversationId();
    const history = this.conversation.getPriorGeminiContents(conversationId);
    const retrievalLimit = this.getRetrievalLimit();
    const retrieval = await this.retrieval.searchRetrieval({
      query: dto.question,
      limit: retrievalLimit,
    });
    const sources: RagChatSource[] = retrieval.results.map((item) => ({
      articleId: item.articleId,
      articleTitle: item.articleTitle,
      relevantChunk: item.chunk,
    }));

    const prompt = buildRagChatPrompt(dto.question, sources);
    const { text } = await this.gemini.generateContent({
      operation: GeminiOperation.Generate,
      userPrompt: prompt,
      priorContents: history,
    });

    this.conversation.appendSuccessfulExchange(
      conversationId,
      dto.question,
      text,
    );

    return {
      answer: text,
      sources,
      conversationId,
    };
  }

  getHistory(conversationId: string) {
    return this.conversation.getHistory(conversationId);
  }

  private getRetrievalLimit(): number {
    const raw = Number(this.config.get<string>('RAG_CHAT_RETRIEVAL_LIMIT'));
    if (!Number.isFinite(raw) || raw <= 0) {
      return 5;
    }
    return Math.min(Math.floor(raw), 20);
  }
}
