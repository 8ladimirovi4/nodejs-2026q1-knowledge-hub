import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { HybridMergeService } from './hybrid-merge.service';
import { IncrementalIndexService } from './incremental-index.service';
import { LexicalSearchService } from './lexical-search.service';
import { RagChatService } from './rag-chat.service';
import { RagConversationService } from './rag-conversation.service';
import { RagController } from './rag.controller';
import { RagIndexingService } from './rag-reindex.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { RerankService } from './rerank.service';
import { VECTOR_STORE } from './vector-store/vector-store.port';
import { QdrantVectorStore } from './vector-store/qdrant-vector-store';
import { AiModule } from 'src/ai/ai.module';
import { ArticleModule } from 'src/article/app.module';

@Module({
  imports: [AiModule, ArticleModule],
  controllers: [RagController],
  providers: [
    QdrantVectorStore,
    { provide: VECTOR_STORE, useExisting: QdrantVectorStore },
    ChunkingService,
    HybridMergeService,
    IncrementalIndexService,
    LexicalSearchService,
    RagChatService,
    RagConversationService,
    RagIndexingService,
    RagRetrievalService,
    RerankService,
  ],
})
export class RagModule {}
