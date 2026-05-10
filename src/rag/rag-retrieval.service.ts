import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RagSearchDto } from './dto/rag-search.dto';
import { HybridMergeService } from './hybrid-merge.service';
import { LexicalSearchService } from './lexical-search.service';
import {
  VECTOR_STORE,
  VectorStorePort,
  type RagVectorSearchFilter,
} from './vector-store/vector-store.port';
import { GeminiService } from 'src/ai/gemini.service';
import { prismaArticleStatusToDomain } from 'src/storage/prisma-mappers';

export type RagSearchResultItem = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
};

export type RagSearchResponseBody = {
  results: RagSearchResultItem[];
};

@Injectable()
export class RagRetrievalService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly lexicalSearch: LexicalSearchService,
    private readonly hybridMerge: HybridMergeService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStorePort,
  ) {}

  async searchRetrieval(dto: RagSearchDto): Promise<RagSearchResponseBody> {
    const queryText = dto.query.trim();
    const vectorFilter = this.buildVectorFilter(dto);
    const [embeddingRows, lexicalHits] = await Promise.all([
      this.gemini.embedTexts([queryText]),
      this.lexicalSearch.search(queryText, dto.limit, vectorFilter),
    ]);
    const queryVector = embeddingRows[0];
    if (queryVector === undefined) {
      throw new HttpException(
        'Embedding provider returned no vector for query',
        HttpStatus.BAD_GATEWAY,
      );
    }
    const semanticHits = await this.vectorStore.searchSimilar(
      queryVector,
      dto.limit,
      vectorFilter,
    );
    const mergedHits = this.hybridMerge.mergeRank(
      semanticHits.map((h) => ({
        articleId: h.payload.articleId,
        articleTitle: h.payload.articleTitle,
        chunk: h.payload.chunkText,
        score: h.score,
      })),
      lexicalHits,
      dto.limit,
    );
    return {
      results: mergedHits.map((h) => ({
        articleId: h.articleId,
        articleTitle: h.articleTitle,
        chunk: h.chunk,
        similarity: h.score,
      })),
    };
  }

  private buildVectorFilter(
    dto: RagSearchDto,
  ): RagVectorSearchFilter | undefined {
    const filter: RagVectorSearchFilter = {};
    let has = false;

    if (dto.articleStatus !== undefined) {
      filter.articleStatus = prismaArticleStatusToDomain(dto.articleStatus);
      has = true;
    }
    if (dto.categoryId !== undefined) {
      filter.categoryId = dto.categoryId;
      has = true;
    }
    if (dto.tags !== undefined && dto.tags.length > 0) {
      filter.tagsAllOf = dto.tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (filter.tagsAllOf.length > 0) {
        has = true;
      } else {
        delete filter.tagsAllOf;
      }
    }

    return has ? filter : undefined;
  }
}
