import { createHash } from 'node:crypto';

export function stableChunkPointUuid(
  articleId: string,
  chunkIndex: number,
): string {
  const digest = createHash('sha256')
    .update(articleId, 'utf8')
    .update('\0')
    .update(String(chunkIndex), 'utf8')
    .digest();
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const h = digest.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
