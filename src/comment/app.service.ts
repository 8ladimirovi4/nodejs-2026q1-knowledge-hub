import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from 'src/common/errors';
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
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';
import { UserRole } from 'src/storage/domain.types';
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
      throw new NotFoundError('Comment not found');
    }
    return prismaCommentToDomain(row);
  }

  async create(
    actor: JwtAccessPayload,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new UnprocessableEntityException();
    }

    const authorId =
      actor.role === UserRole.ADMIN ? (dto.authorId ?? null) : actor.userId;

    const row = await this.prisma.comment.create({
      data: {
        id: randomUUID(),
        content: dto.content,
        articleId: dto.articleId,
        authorId,
      },
    });
    return prismaCommentToDomain(row);
  }

  async remove(actor: JwtAccessPayload, id: string): Promise<void> {
    const exists = await this.prisma.comment.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundError('Comment not found');
    }

    this.assertCanDeleteComment(actor, exists.authorId);

    await this.prisma.comment.delete({ where: { id } });
  }

  private assertCanDeleteComment(
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
