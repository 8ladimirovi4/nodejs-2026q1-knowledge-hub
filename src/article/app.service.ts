import { Injectable, NotFoundException } from '@nestjs/common';
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
import type { Prisma } from '../../generated/prisma/client';
import type { FindArticlesQueryDto } from './dto/find-articles.query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { randomUUID } from 'crypto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

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
    let list = rows.map(prismaArticleToDomain);
    const sorted = applyListSort(list, sortBy, order, ARTICLE_LIST_SORT_KEYS);
    return applyOptionalPagination(sorted, page, limit);
  }

  async findOne(id: string): Promise<Article> {
    const row = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!row) {
      throw new NotFoundException();
    }
    return prismaArticleToDomain(row);
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const row = await this.prisma.article.create({
      data: {
        id: randomUUID(),
        title: dto.title,
        content: dto.content,
        status: domainArticleStatusToPrisma(
          dto.status ?? ArticleStatus.DRAFT,
        ),
        authorId: dto.authorId ?? null,
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

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!existing) {
      throw new NotFoundException();
    }

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

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.article.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException();
    }
    await this.prisma.article.delete({ where: { id } });
  }
}
