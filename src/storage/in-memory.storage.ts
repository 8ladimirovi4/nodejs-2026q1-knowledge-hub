import { Injectable } from '@nestjs/common';
import type { Article, Category, Comment, User } from './domain.types';
import { StorageFacade } from './storage.facade';
import type {
  ArticleStore,
  CategoryStore,
  CommentStore,
  UserStore,
} from './store.types';

@Injectable()
export class InMemoryStorage extends StorageFacade {
  private readonly userMap = new Map<string, User>();
  private readonly articleMap = new Map<string, Article>();
  private readonly categoryMap = new Map<string, Category>();
  private readonly commentMap = new Map<string, Comment>();

  readonly users: UserStore = {
    getAll: () => Array.from(this.userMap.values()),
    getById: (id) => this.userMap.get(id),
    upsert: (entity) => {
      this.userMap.set(entity.id, entity);
    },
    delete: (id) => this.userMap.delete(id),
  };

  readonly articles: ArticleStore = {
    getAll: () => Array.from(this.articleMap.values()),
    getById: (id) => this.articleMap.get(id),
    upsert: (entity) => {
      this.articleMap.set(entity.id, entity);
    },
    delete: (id) => this.articleMap.delete(id),
  };

  readonly categories: CategoryStore = {
    getAll: () => Array.from(this.categoryMap.values()),
    getById: (id) => this.categoryMap.get(id),
    upsert: (entity) => {
      this.categoryMap.set(entity.id, entity);
    },
    delete: (id) => this.categoryMap.delete(id),
  };

  readonly comments: CommentStore = {
    getAll: () => Array.from(this.commentMap.values()),
    getById: (id) => this.commentMap.get(id),
    getByArticleId: (articleId) =>
      Array.from(this.commentMap.values()).filter(
        (c) => c.articleId === articleId,
      ),
    upsert: (entity) => {
      this.commentMap.set(entity.id, entity);
    },
    delete: (id) => this.commentMap.delete(id),
  };
}
