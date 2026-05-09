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

export abstract class VectorStorePort {
  abstract ensureCollection(): Promise<void>;

  abstract upsertPoints(points: RagVectorUpsertPoint[]): Promise<void>;

  abstract deleteByArticleId(articleId: string): Promise<void>;
}

export const VECTOR_STORE: InjectionToken<VectorStorePort> =
  Symbol('VECTOR_STORE');
