import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { resolveEmbeddingVectorDimensions } from './embedding-model-vector-size';
import {
  RagVectorPayload,
  RagVectorSearchFilter,
  RagVectorSearchHit,
  RagVectorUpsertPoint,
  VectorStorePort,
} from './vector-store.port';

@Injectable()
export class QdrantVectorStore extends VectorStorePort {
  private readonly logger = new Logger(QdrantVectorStore.name);
  private readonly client: QdrantClient;
  private readonly collection: string;
  private readonly vectorSize: number;

  constructor(private readonly config: ConfigService) {
    super();

    const provider = (
      this.config.get<string>('RAG_VECTOR_DB_PROVIDER') ?? 'qdrant'
    ).toLowerCase();
    if (provider !== 'qdrant') {
      throw new InternalServerErrorException(
        `Unsupported RAG_VECTOR_DB_PROVIDER: ${provider}`,
      );
    }

    const url = this.config.get<string>('RAG_VECTOR_DB_URL');
    if (!url?.trim()) {
      throw new InternalServerErrorException('RAG_VECTOR_DB_URL is not set');
    }

    const trimmedUrl = url.trim();

    this.collection =
      this.config.get<string>('RAG_VECTOR_COLLECTION') ??
      'knowledge_hub_articles';

    try {
      this.vectorSize = resolveEmbeddingVectorDimensions(
        this.config.get<string>('GEMINI_EMBEDDING_MODEL'),
        this.config.get<string>('RAG_EMBEDDING_VECTOR_SIZE'),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid embedding model';
      throw new InternalServerErrorException(msg);
    }

    this.client = new QdrantClient({
      url: trimmedUrl,
      checkCompatibility: false,
    });
  }

  async ensureCollection(): Promise<void> {
    try {
      const { exists } = await this.client.collectionExists(this.collection);
      if (exists) {
        return;
      }

      await this.client.createCollection(this.collection, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
    } catch (err) {
      this.unwrapAndThrow(err);
    }
  }

  async upsertPoints(points: RagVectorUpsertPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const invalid = points.find((p) => p.vector.length !== this.vectorSize);
    if (invalid !== undefined) {
      throw new InternalServerErrorException(
        `Embedding dimension mismatch: expected ${this.vectorSize}, got ${invalid.vector.length}`,
      );
    }

    try {
      await this.client.upsert(this.collection, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: this.serializePayload(p.payload),
        })),
      });
    } catch (err) {
      this.unwrapAndThrow(err);
    }
  }

  async deleteByArticleId(articleId: string): Promise<void> {
    try {
      await this.client.delete(this.collection, {
        wait: true,
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      });
    } catch (err) {
      this.unwrapAndThrow(err);
    }
  }

  async searchSimilar(
    vector: number[],
    limit: number,
    filter?: RagVectorSearchFilter,
  ): Promise<RagVectorSearchHit[]> {
    if (vector.length !== this.vectorSize) {
      throw new InternalServerErrorException(
        `Query embedding dimension mismatch: expected ${this.vectorSize}, got ${vector.length}`,
      );
    }

    const limitClamped = Math.min(Math.max(limit, 1), 20);

    try {
      const raw = await this.client.search(this.collection, {
        vector,
        limit: limitClamped,
        filter: this.buildSearchFilter(filter),
        with_payload: true,
      });

      const points = Array.isArray(raw)
        ? (raw as Array<{ score?: number; payload?: unknown }>)
        : [];
      const hits: RagVectorSearchHit[] = [];
      for (const p of points) {
        const payload = this.parseStoredPayload(p.payload);
        if (payload === null) {
          continue;
        }
        const score =
          typeof p.score === 'number' && Number.isFinite(p.score) ? p.score : 0;
        hits.push({ score, payload });
      }
      return hits;
    } catch (err) {
      this.unwrapAndThrow(err);
    }
  }

  private buildSearchFilter(
    filter?: RagVectorSearchFilter,
  ): { must: object[] } | undefined {
    if (!filter) {
      return undefined;
    }
    const must: object[] = [];
    if (filter.articleStatus !== undefined && filter.articleStatus !== '') {
      must.push({
        key: 'articleStatus',
        match: { value: filter.articleStatus },
      });
    }
    if (filter.categoryId !== undefined && filter.categoryId !== null) {
      must.push({
        key: 'categoryId',
        match: { value: filter.categoryId },
      });
    }
    if (filter.tagsAllOf !== undefined) {
      for (const tag of filter.tagsAllOf) {
        const t = tag.trim();
        if (t.length > 0) {
          must.push({ key: 'tagNames', match: { value: t } });
        }
      }
    }
    return must.length > 0 ? { must } : undefined;
  }

  private parseStoredPayload(raw: unknown): RagVectorPayload | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const o = raw as Record<string, unknown>;
    const articleId = o.articleId;
    const articleTitle = o.articleTitle;
    const chunkIndex = o.chunkIndex;
    const chunkText = o.chunkText;
    if (
      typeof articleId !== 'string' ||
      typeof articleTitle !== 'string' ||
      typeof chunkIndex !== 'number' ||
      !Number.isFinite(chunkIndex) ||
      typeof chunkText !== 'string'
    ) {
      return null;
    }
    const out: RagVectorPayload = {
      articleId,
      articleTitle,
      chunkIndex,
      chunkText,
    };
    if (typeof o.articleStatus === 'string') {
      out.articleStatus = o.articleStatus;
    }
    if (o.categoryId === null || typeof o.categoryId === 'string') {
      out.categoryId = o.categoryId as string | null;
    }
    if (Array.isArray(o.tagNames)) {
      const names = o.tagNames.filter(
        (x): x is string => typeof x === 'string',
      );
      if (names.length > 0) {
        out.tagNames = names;
      }
    }
    return out;
  }

  private serializePayload(payload: RagVectorPayload) {
    const out: Record<string, unknown> = {
      articleId: payload.articleId,
      articleTitle: payload.articleTitle,
      chunkIndex: payload.chunkIndex,
      chunkText: payload.chunkText,
    };

    if (payload.articleStatus !== undefined) {
      out.articleStatus = payload.articleStatus;
    }
    if (payload.categoryId !== undefined) {
      out.categoryId = payload.categoryId;
    }
    if (payload.tagNames !== undefined && payload.tagNames.length > 0) {
      out.tagNames = payload.tagNames;
    }

    return out;
  }

  private unwrapAndThrow(err: unknown): never {
    let detail = err instanceof Error ? err.message : String(err);
    const causeMsg = this.errorCauseMessage(err);
    if (causeMsg !== undefined) {
      detail = `${detail}; cause: ${causeMsg}`;
    }
    this.logger.warn(`Qdrant request failed: ${detail}`);
    throw new ServiceUnavailableException('Database is unavailable');
  }

  private errorCauseMessage(err: unknown): string | undefined {
    if (!(err instanceof Error)) {
      return undefined;
    }
    const withCause = err as Error & { cause?: unknown };
    const c = withCause.cause;
    return c instanceof Error ? c.message : undefined;
  }
}
