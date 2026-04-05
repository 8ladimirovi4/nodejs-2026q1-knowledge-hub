import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, type Article } from 'src/storage/domain.types';
import { StorageFacade } from 'src/storage';
import type { FindArticlesQueryDto } from './dto/find-articles.query.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { randomUUID } from 'crypto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly storage: StorageFacade) {}

  async findAll(query: FindArticlesQueryDto): Promise<Article[]> {
    let list = this.storage.articles.getAll();
    if (query.status !== undefined) {
      list = list.filter((a) => a.status === query.status);
    }
    if (query.categoryId !== undefined) {
      list = list.filter((a) => a.categoryId === query.categoryId);
    }
    if (query.tag !== undefined) {
      list = list.filter((a) => a.tags.includes(query.tag));
    }
    return list;
  }
  async findOne(id: string): Promise<Article> {
    const article = this.storage.articles.getById(id);
    if (!article) {
      throw new NotFoundException();
    }
    return article;
  }
  create(dto: CreateArticleDto): Article {
    const now = Date.now();
    const article: Article = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status ?? ArticleStatus.DRAFT,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.storage.articles.upsert(article);
    return article;
  }

  async updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = this.storage.articles.getById(id);
    if (!article) {
      throw new NotFoundException();
    }
    const updated: Article = {
      ...article,
      title: dto.title ?? article.title,
      content: dto.content ?? article.content,
      status: dto.status ?? article.status,
      categoryId:
        dto.categoryId !== undefined ? dto.categoryId : article.categoryId,
      tags: dto.tags ?? article.tags,
      authorId: article.authorId,
      updatedAt: Date.now(),
    };
    this.storage.articles.upsert(updated);
    return updated;
  }

  remove(id: string): void {
    const article = this.storage.articles.getById(id);
    if (!article) {
      throw new NotFoundException();
    }
    for (const comment of this.storage.comments.getAll()) {
      if (comment.articleId === id) {
        this.storage.comments.delete(comment.id);
      }
    }
    this.storage.articles.delete(id);
  }
}