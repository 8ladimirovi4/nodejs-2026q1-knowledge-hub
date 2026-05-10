import { InjectionToken } from '@nestjs/common';

export type RagVectorPayload = {
  articleId: string;
  articleTitle: string;
  chunkIndex: number;
  chunkText: string;
  articleStatus?: string;
  categoryId?: string | null;
  tagNames?: string[];
};

export type RagVectorUpsertPoint = {
  id: string;
  vector: number[];
  payload: RagVectorPayload;
};

export type RagVectorSearchFilter = {
  articleStatus?: string;
  categoryId?: string;
  tagsAllOf?: string[];
};

export type RagVectorSearchHit = {
  score: number;
  payload: RagVectorPayload;
};

export abstract class VectorStorePort {
  abstract ensureCollection(): Promise<void>;

  abstract upsertPoints(points: RagVectorUpsertPoint[]): Promise<void>;

  abstract deleteByArticleId(articleId: string): Promise<void>;

  abstract hasArticlePoints(articleId: string): Promise<boolean>;

  abstract searchSimilar(
    vector: number[],
    limit: number,
    filter?: RagVectorSearchFilter,
  ): Promise<RagVectorSearchHit[]>;
}

export const VECTOR_STORE: InjectionToken<VectorStorePort> =
  Symbol('VECTOR_STORE');
