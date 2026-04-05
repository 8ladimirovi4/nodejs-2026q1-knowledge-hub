import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Comment } from 'src/storage/domain.types';
import { StorageFacade } from 'src/storage';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly storage: StorageFacade) {}

  async findByArticle(articleId: string): Promise<Comment[]> {
    return this.storage.comments.getByArticleId(articleId);
  }

  async findOne(id: string): Promise<Comment> {
    const comment = this.storage.comments.getById(id);
    if (!comment) {
      throw new NotFoundException();
    }
    return comment;
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    if (!this.storage.articles.getById(dto.articleId)) {
      throw new UnprocessableEntityException();
    }
    const now = Date.now();
    const comment: Comment = {
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId: dto.authorId ?? null,
      createdAt: now,
    };
    this.storage.comments.upsert(comment);
    return comment;
  }

  async remove(id: string): Promise<void> {
    const comment = this.storage.comments.getById(id);
    if (!comment) {
      throw new NotFoundException();
    }
    this.storage.comments.delete(id);
  }
}
