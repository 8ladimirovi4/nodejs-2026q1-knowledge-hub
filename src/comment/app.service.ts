import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Comment } from 'src/storage/domain.types';
import { prismaCommentToDomain } from 'src/storage/prisma-mappers';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  applyOptionalPagination,
  type PaginatedList,
} from 'src/common/pagination/apply-pagination.util';
import { COMMENT_LIST_SORT_KEYS } from 'src/common/sorting/list-sort.keys';
import { applyListSort } from 'src/common/sorting/list-sort.util';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async findByArticle(
    articleId: string,
    sortBy?: string,
    order?: string,
    page?: string,
    limit?: string,
  ): Promise<Comment[] | PaginatedList<Comment>> {
    const rows = await this.prisma.comment.findMany({
      where: { articleId },
    });
    const list = rows.map(prismaCommentToDomain);
    const sorted = applyListSort(list, sortBy, order, COMMENT_LIST_SORT_KEYS);
    return applyOptionalPagination(sorted, page, limit);
  }

  async findOne(id: string): Promise<Comment> {
    const row = await this.prisma.comment.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    return prismaCommentToDomain(row);
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new UnprocessableEntityException();
    }
    const row = await this.prisma.comment.create({
      data: {
        id: randomUUID(),
        content: dto.content,
        articleId: dto.articleId,
        authorId: dto.authorId ?? null,
      },
    });
    return prismaCommentToDomain(row);
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.comment.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException();
    }
    await this.prisma.comment.delete({ where: { id } });
  }
}
