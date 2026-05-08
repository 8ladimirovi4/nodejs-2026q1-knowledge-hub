import { InjectionToken } from '@nestjs/common';

/**
 * Inject with `@Inject(VECTOR_STORE)` and type as `VectorStorePort`.
 * Bind a concrete adapter (e.g. Qdrant) in `RagModule` via `providers`.
 */
export abstract class VectorStorePort {}

export const VECTOR_STORE: InjectionToken<VectorStorePort> =
  Symbol('VECTOR_STORE');
