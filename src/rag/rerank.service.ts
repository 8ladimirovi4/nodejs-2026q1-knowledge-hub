import { Injectable } from '@nestjs/common';
import { tokenizeSearchText } from 'src/common/text/tokenize.util';
import type { HybridMergedItem } from './hybrid-merge.service';

export type HeuristicRerankResultItem = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
};

const POOL_MIN = 8;
const POOL_MAX = 40;
const POOL_FACTOR = 4;

const DEFAULT_MERGE_WEIGHT = 0.4;
const DEFAULT_OVERLAP_WEIGHT = 0.6;

@Injectable()
export class RerankService {
  poolSizeForLimit(limit: number): number {
    const L = Math.min(Math.max(limit, 1), 20);
    return Math.min(POOL_MAX, Math.max(POOL_MIN, L * POOL_FACTOR));
  }

  rerank(
    query: string,
    items: HybridMergedItem[],
    limit: number,
    weights: { merge: number; overlap: number } = {
      merge: DEFAULT_MERGE_WEIGHT,
      overlap: DEFAULT_OVERLAP_WEIGHT,
    },
  ): HeuristicRerankResultItem[] {
    const effectiveLimit = Math.min(Math.max(limit, 1), 20);
    if (items.length === 0) {
      return [];
    }

    const queryTokens = new Set(tokenizeSearchText(query));
    const wMerge = Math.max(0, weights.merge);
    const wOverlap = Math.max(0, weights.overlap);
    const wSum = wMerge + wOverlap;
    const nm = wSum > 0 ? wMerge / wSum : 0;
    const no = wSum > 0 ? wOverlap / wSum : 1;

    const mergeScores = items.map((i) => i.score);
    const mergeMin = Math.min(...mergeScores);
    const mergeMax = Math.max(...mergeScores);
    const mergeSpan = mergeMax - mergeMin;

    const scored = items.map((item) => {
      const normMerge =
        mergeSpan < Number.EPSILON ? 1 : (item.score - mergeMin) / mergeSpan;
      const overlap =
        queryTokens.size === 0
          ? 0
          : this.tokenCoverage(queryTokens, item.chunk, item.articleTitle);
      const similarity = nm * normMerge + no * overlap;
      return {
        articleId: item.articleId,
        articleTitle: item.articleTitle,
        chunk: item.chunk,
        similarity,
      };
    });

    scored.sort((a, b) => {
      const d = b.similarity - a.similarity;
      if (Math.abs(d) > Number.EPSILON) {
        return d;
      }
      const id = a.articleId.localeCompare(b.articleId);
      if (id !== 0) {
        return id;
      }
      return a.chunk.localeCompare(b.chunk);
    });

    return scored.slice(0, effectiveLimit);
  }

  private tokenCoverage(
    queryTokens: Set<string>,
    chunk: string,
    title: string,
  ): number {
    const haystack = `${title}\n${chunk}`.toLowerCase();
    let hits = 0;
    for (const t of queryTokens) {
      if (haystack.includes(t)) {
        hits += 1;
      }
    }
    return hits / queryTokens.size;
  }
}
