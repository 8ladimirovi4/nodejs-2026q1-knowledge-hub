import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Prisma } from '@prisma/client';
import { RagReIndexDto } from './dto/rag-reindex.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundError } from 'src/common/errors';
import { ArticleStatus } from 'src/storage';
import {
  domainArticleStatusToPrisma,
  prismaArticleToDomain,
} from 'src/storage/prisma-mappers';
import {
  VECTOR_STORE,
  VectorStorePort,
  type RagVectorUpsertPoint,
} from './vector-store/vector-store.port';
import { ChunkingService } from './chunking.service';
import { GeminiService } from 'src/ai/gemini.service';
import { stableChunkPointUuid } from './vector-store/stable-point-uuid';

export type RagReindexSummary = {
  indexedArticles: number;
  indexedChunks: number;
  vectorCollection: string;
};

@Injectable()
export class RagIndexingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStorePort,
    private readonly chunkService: ChunkingService,
    private readonly gemini: GeminiService,
  ) {}

  async createVectorIndex(dto: RagReIndexDto): Promise<RagReindexSummary> {
    const where: Prisma.ArticleWhereInput = {};

    if (dto.onlyPublished !== false) {
      where.status = domainArticleStatusToPrisma(ArticleStatus.PUBLISHED);
    }

    if (dto.articleIds?.length) {
      where.id = { in: dto.articleIds };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: { tags: true },
    });

    await this.vectorStore.ensureCollection();

    const vectorCollection =
      this.config.get<string>('RAG_VECTOR_COLLECTION') ??
      'knowledge_hub_articles';

    let indexedChunks = 0;

    for (const row of articles) {
      const article = prismaArticleToDomain(row);

      await this.vectorStore.deleteByArticleId(article.id);

      const fullText = this.indexableArticleText(
        article.title,
        article.content,
      );
      const chunks = this.chunkService.splitIntoChunks(fullText);
      if (chunks.length === 0) {
        continue;
      }

      const vectors = await this.gemini.embedTexts(chunks.map((c) => c.text));

      const points: RagVectorUpsertPoint[] = chunks.map((chunk, i) => ({
        id: stableChunkPointUuid(article.id, chunk.chunkIndex),
        vector: vectors[i],
        payload: {
          articleId: article.id,
          articleTitle: article.title,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.text,
          articleStatus: article.status,
          categoryId: article.categoryId,
          tagNames: [...article.tags].sort(),
        },
      }));

      await this.vectorStore.upsertPoints(points);
      indexedChunks += points.length;
    }

    return {
      indexedArticles: articles.length,
      indexedChunks,
      vectorCollection,
    };
  }

  private indexableArticleText(title: string, content: string): string {
    const t = title.trim();
    const c = content.trim();
    if (t.length > 0 && c.length > 0) {
      return `${t}\n\n${c}`;
    }
    return t.length > 0 ? t : c;
  }

  removeArticleFromIndex(_id: string) {
    const article = false;
    if (!article) {
      throw new NotFoundError('article not found');
    }
    return 'remove article from index';
  }
}
