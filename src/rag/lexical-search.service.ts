import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { domainArticleStatusToPrisma } from 'src/storage/prisma-mappers';
import { ArticleStatus } from 'src/storage/domain.types';
import { type RagVectorSearchFilter } from './vector-store/vector-store.port';

export type LexicalSearchCandidate = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  score: number;
};

@Injectable()
export class LexicalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: string,
    limit: number,
    filter?: RagVectorSearchFilter,
  ): Promise<LexicalSearchCandidate[]> {
    const queryText = query.trim();
    if (queryText.length === 0) {
      return [];
    }

    const tokens = this.tokenize(queryText);
    if (tokens.length === 0) {
      return [];
    }

    const where = this.buildWhere(filter, tokens);
    const rows = await this.prisma.article.findMany({
      where,
      include: { tags: true },
      take: Math.min(Math.max(limit, 1), 20) * 3,
      orderBy: { updatedAt: 'desc' },
    });

    const ranked = rows
      .map((row) => {
        const score = this.scoreArticle(
          queryText,
          tokens,
          row.title,
          row.content,
        );
        return { row, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(limit, 1), 20))
      .map(({ row, score }) => ({
        articleId: row.id,
        articleTitle: row.title,
        chunk: this.buildChunkPreview(queryText, row.content),
        score,
      }));

    return ranked;
  }

  private buildWhere(
    filter: RagVectorSearchFilter | undefined,
    tokens: string[],
  ): Prisma.ArticleWhereInput {
    const and: Prisma.ArticleWhereInput[] = [];

    if (filter?.articleStatus) {
      const domainStatus = this.toDomainArticleStatus(filter.articleStatus);
      const mapped =
        domainStatus === undefined
          ? undefined
          : domainArticleStatusToPrisma(domainStatus);
      if (mapped) {
        and.push({ status: mapped });
      }
    }

    if (filter?.categoryId) {
      and.push({ categoryId: filter.categoryId });
    }

    if (filter?.tagsAllOf && filter.tagsAllOf.length > 0) {
      for (const tag of filter.tagsAllOf) {
        const trimmed = tag.trim();
        if (trimmed.length > 0) {
          and.push({
            tags: {
              some: {
                name: { equals: trimmed, mode: 'insensitive' },
              },
            },
          });
        }
      }
    }

    and.push({
      OR: tokens.map((token) => ({
        OR: [
          { title: { contains: token, mode: 'insensitive' } },
          { content: { contains: token, mode: 'insensitive' } },
        ],
      })),
    });

    return and.length > 0 ? { AND: and } : {};
  }

  private toDomainArticleStatus(status: string): ArticleStatus | undefined {
    switch (status) {
      case 'draft':
        return ArticleStatus.DRAFT;
      case 'published':
        return ArticleStatus.PUBLISHED;
      case 'archived':
        return ArticleStatus.ARCHIVED;
      default:
        return undefined;
    }
  }

  private tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
  }

  private scoreArticle(
    query: string,
    tokens: string[],
    title: string,
    content: string,
  ): number {
    const normalizedTitle = title.toLowerCase();
    const normalizedContent = content.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    let score = 0;

    if (normalizedTitle.includes(normalizedQuery)) {
      score += 3;
    }
    if (normalizedContent.includes(normalizedQuery)) {
      score += 2;
    }

    for (const token of tokens) {
      if (normalizedTitle.includes(token)) {
        score += 1.5;
      }
      if (normalizedContent.includes(token)) {
        score += 0.75;
      }
    }

    return score;
  }

  private buildChunkPreview(query: string, content: string): string {
    const text = content.trim();
    if (text.length <= 800) {
      return text;
    }

    const idx = text.toLowerCase().indexOf(query.trim().toLowerCase());
    if (idx < 0) {
      return text.slice(0, 800);
    }

    const start = Math.max(0, idx - 250);
    const end = Math.min(text.length, start + 800);
    return text.slice(start, end);
  }
}
