import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TextChunk = {
  chunkIndex: number;
  text: string;
};

@Injectable()
export class ChunkingService {
  constructor(private readonly config: ConfigService) {}

  splitIntoChunks(fullText: string): TextChunk[] {
    if (fullText.length === 0) {
      return [];
    }

    const chunkSize = this.resolveChunkSize();
    const overlap = this.resolveOverlap();

    const chunks: TextChunk[] = [];
    let cursor = 0;
    let chunkIndex = 0;

    while (cursor < fullText.length) {
      const end = Math.min(cursor + chunkSize, fullText.length);
      chunks.push({ chunkIndex, text: fullText.slice(cursor, end) });
      chunkIndex += 1;

      if (end >= fullText.length) {
        break;
      }

      let nextCursor = cursor + chunkSize - overlap;
      if (nextCursor <= cursor) {
        nextCursor = cursor + 1;
      }
      cursor = nextCursor;
    }

    return chunks;
  }

  private resolveChunkSize(): number {
    const raw = this.config.get<string>('RAG_CHUNK_SIZE');
    const n = Number.parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 800;
  }

  private resolveOverlap(): number {
    const raw = this.config.get<string>('RAG_CHUNK_OVERLAP');
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n) || n < 0) {
      return 200;
    }
    return n;
  }
}
