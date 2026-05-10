import { Injectable } from '@nestjs/common';

export type RetrievalChannel = 'semantic' | 'lexical';

export type HybridCandidate = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  score: number;
  channel: RetrievalChannel;
};

export type HybridMergedItem = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  score: number;
  channels: RetrievalChannel[];
};

@Injectable()
export class HybridMergeService {
  mergeRank(
    semantic: Omit<HybridCandidate, 'channel'>[],
    lexical: Omit<HybridCandidate, 'channel'>[],
    limit: number,
    weights: { semantic: number; lexical: number } = {
      semantic: 0.7,
      lexical: 0.3,
    },
  ): HybridMergedItem[] {
    const effectiveLimit = Math.min(Math.max(limit, 1), 20);
    const semanticRows = semantic.map((x) => ({
      ...x,
      channel: 'semantic' as const,
    }));
    const lexicalRows = lexical.map((x) => ({
      ...x,
      channel: 'lexical' as const,
    }));

    const semanticNorm = this.minMaxNormalize(semanticRows);
    const lexicalNorm = this.minMaxNormalize(lexicalRows);

    const grouped = new Map<string, HybridMergedItem>();

    const apply = (
      rows: Array<HybridCandidate & { normalized: number }>,
      channelWeight: number,
    ) => {
      for (const row of rows) {
        const key = this.chunkKey(row.articleId, row.chunk);
        const weighted = row.normalized * channelWeight;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            articleId: row.articleId,
            articleTitle: row.articleTitle,
            chunk: row.chunk,
            score: weighted,
            channels: [row.channel],
          });
          continue;
        }

        existing.score += weighted;
        if (!existing.channels.includes(row.channel)) {
          existing.channels.push(row.channel);
        }
      }
    };

    apply(semanticNorm, Math.max(weights.semantic, 0));
    apply(lexicalNorm, Math.max(weights.lexical, 0));

    return [...grouped.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveLimit);
  }

  private minMaxNormalize(
    rows: HybridCandidate[],
  ): Array<HybridCandidate & { normalized: number }> {
    if (rows.length === 0) {
      return [];
    }
    const scores = rows.map((r) => r.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    if (max - min < Number.EPSILON) {
      return rows.map((r) => ({ ...r, normalized: 1 }));
    }

    return rows.map((r) => ({
      ...r,
      normalized: (r.score - min) / (max - min),
    }));
  }

  private chunkKey(articleId: string, chunk: string): string {
    return `${articleId}::${chunk.trim().slice(0, 200)}`;
  }
}
