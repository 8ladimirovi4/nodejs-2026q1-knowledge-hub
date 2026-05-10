/**
 * Vector length for Qdrant must match embedContent output for the chosen model.
 *
 * Gemini API text embeddings: model id is typically `gemini-embedding-001`. Default output is 3072 dims; MRL allows 128–3072 via
 * output_dimensionality (768, 1536, 3072 recommended). See:
 * https://ai.google.dev/gemini-api/docs/models/gemini-embedding-001
 * https://ai.google.dev/gemini-api/docs/embeddings
 *
 * Optional `RAG_EMBEDDING_VECTOR_SIZE` overrides inferred size (must match API).
 */
const DEFAULT_GEMINI_EMBEDDING_DIM = 3072;

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const t = String(raw).trim();
  if (!t) {
    return undefined;
  }
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `RAG_EMBEDDING_VECTOR_SIZE must be a positive integer, got: ${raw}`,
    );
  }
  return n;
}

export function resolveEmbeddingVectorDimensions(
  embeddingModelId: string | undefined,
  explicitVectorSize: string | undefined,
): number {
  const fromEnv = parsePositiveInt(explicitVectorSize);
  if (fromEnv !== undefined) {
    return fromEnv;
  }

  const raw = (embeddingModelId ?? '').trim();
  if (!raw) {
    throw new Error('GEMINI_EMBEDDING_MODEL must be set');
  }

  const key = raw.toLowerCase().replace(/^models\//, '');

  if (key.includes('gemini-embedding')) {
    return DEFAULT_GEMINI_EMBEDDING_DIM;
  }

  if (key.includes('text-embedding-004')) {
    return 768;
  }

  if (key.includes('text-embedding-001')) {
    return DEFAULT_GEMINI_EMBEDDING_DIM;
  }

  throw new Error(
    `Unsupported GEMINI_EMBEDDING_MODEL for vector size (set RAG_EMBEDDING_VECTOR_SIZE or extend mapping): ${raw}`,
  );
}
