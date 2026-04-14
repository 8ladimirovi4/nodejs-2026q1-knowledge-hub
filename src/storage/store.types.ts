import type { Article, Category, Comment, User } from './domain.types';

export interface UserStore {
  getAll(): User[];
  getById(id: string): User | undefined;
  upsert(entity: User): void;
  delete(id: string): boolean;
}

export interface ArticleStore {
  getAll(): Article[];
  getById(id: string): Article | undefined;
  upsert(entity: Article): void;
  delete(id: string): boolean;
}

export interface CategoryStore {
  getAll(): Category[];
  getById(id: string): Category | undefined;
  upsert(entity: Category): void;
  delete(id: string): boolean;
}

export interface CommentStore {
  getAll(): Comment[];
  getById(id: string): Comment | undefined;
  getByArticleId(articleId: string): Comment[];
  upsert(entity: Comment): void;
  delete(id: string): boolean;
}
