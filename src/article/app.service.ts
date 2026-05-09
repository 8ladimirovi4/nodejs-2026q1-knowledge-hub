import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from 'src/common/errors';
import {
  applyOptionalPagination,
  type PaginatedList,
} from 'src/common/pagination/apply-pagination.util';
import { ARTICLE_LIST_SORT_KEYS } from 'src/common/sorting/list-sort.keys';
import { applyListSort } from 'src/common/sorting/list-sort.util';
import { ArticleStatus, type Article } from 'src/storage/domain.types';
import {
  domainArticleStatusToPrisma,
  prismaArticleToDomain,
} from 'src/storage/prisma-mappers';
import { PrismaService } from 'src/prisma/prisma.service';
import { type Prisma } from '@prisma/client';
import type { FindArticlesQueryDto } from './dto/find-articles.query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { randomUUID } from 'crypto';
import { UpdateArticleDto } from './dto/update-article.dto';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';
import { UserRole } from 'src/storage/domain.types';
import {
  VECTOR_STORE,
  type VectorStorePort,
} from 'src/rag/vector-store/vector-store.port';

@Injectable()
export class ArticleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStorePort,
  ) {}

  async findAll(
    query: FindArticlesQueryDto,
    sortBy?: string,
    order?: string,
    page?: string,
    limit?: string,
  ): Promise<Article[] | PaginatedList<Article>> {
    const where: Prisma.ArticleWhereInput = {};
    if (query.status !== undefined) {
      where.status = domainArticleStatusToPrisma(query.status);
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    if (query.tag !== undefined) {
      where.tags = { some: { name: query.tag } };
    }

    const rows = await this.prisma.article.findMany({
      where,
      include: { tags: true },
    });
    const list = rows.map(prismaArticleToDomain);
    const sorted = applyListSort(list, sortBy, order, ARTICLE_LIST_SORT_KEYS);
    return applyOptionalPagination(sorted, page, limit);
  }

  async findOne(id: string): Promise<Article> {
    const row = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!row) {
      throw new NotFoundError('Article not found');
    }
    return prismaArticleToDomain(row);
  }

  async create(
    actor: JwtAccessPayload,
    dto: CreateArticleDto,
  ): Promise<Article> {
    const authorId =
      actor.role === UserRole.ADMIN ? (dto.authorId ?? null) : actor.userId;

    const row = await this.prisma.article.create({
      data: {
        id: randomUUID(),
        title: dto.title,
        content: dto.content,
        status: domainArticleStatusToPrisma(dto.status ?? ArticleStatus.DRAFT),
        authorId,
        categoryId: dto.categoryId ?? null,
        tags: {
          connectOrCreate: (dto.tags ?? []).map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      include: { tags: true },
    });
    return prismaArticleToDomain(row);
  }

  async update(
    actor: JwtAccessPayload,
    id: string,
    dto: UpdateArticleDto,
  ): Promise<Article> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!existing) {
      throw new NotFoundError('Article not found');
    }

    this.assertCanModifyArticle(actor, existing.authorId);

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ArticleUpdateInput = {};
      if (dto.title !== undefined) {
        data.title = dto.title;
      }
      if (dto.content !== undefined) {
        data.content = dto.content;
      }
      if (dto.status !== undefined) {
        data.status = domainArticleStatusToPrisma(dto.status);
      }
      if (dto.categoryId !== undefined) {
        if (dto.categoryId === null) {
          data.category = { disconnect: true };
        } else {
          data.category = { connect: { id: dto.categoryId } };
        }
      }

      if (Object.keys(data).length > 0) {
        await tx.article.update({ where: { id }, data });
      }

      if (dto.tags !== undefined) {
        await tx.article.update({
          where: { id },
          data: { tags: { set: [] } },
        });
        await tx.article.update({
          where: { id },
          data: {
            tags: {
              connectOrCreate: dto.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          },
        });
      }
    });

    const row = await this.prisma.article.findUniqueOrThrow({
      where: { id },
      include: { tags: true },
    });
    return prismaArticleToDomain(row);
  }

  async remove(actor: JwtAccessPayload, id: string): Promise<void> {
    const exists = await this.prisma.article.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundError('Article not found');
    }

    this.assertCanModifyArticle(actor, exists.authorId);

    await this.prisma.article.delete({ where: { id } });
    await this.vectorStore.deleteByArticleId(id);
  }

  private assertCanModifyArticle(
    actor: JwtAccessPayload,
    authorId: string | null,
  ): void {
    if (actor.role === UserRole.ADMIN) {
      return;
    }
    if (authorId === null || authorId !== actor.userId) {
      throw new ForbiddenError('Insufficient permissions');
    }
  }
}
