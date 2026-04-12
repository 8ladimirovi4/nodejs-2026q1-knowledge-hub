import type { Prisma } from '../../generated/prisma/client';
import {
  ArticleStatus as PrismaArticleStatus,
  UserRole as PrismaUserRole,
} from '../../generated/prisma/enums';
import {
  ArticleStatus,
  type Article,
  type Category,
  type Comment,
  UserRole,
  type User,
} from './domain.types';

export function prismaRoleToDomain(role: PrismaUserRole): UserRole {
  switch (role) {
    case PrismaUserRole.ADMIN:
      return UserRole.ADMIN;
    case PrismaUserRole.EDITOR:
      return UserRole.EDITOR;
    case PrismaUserRole.VIEWER:
      return UserRole.VIEWER;
    default:
      return UserRole.VIEWER;
  }
}

export function domainRoleToPrisma(role: UserRole): PrismaUserRole {
  switch (role) {
    case UserRole.ADMIN:
      return PrismaUserRole.ADMIN;
    case UserRole.EDITOR:
      return PrismaUserRole.EDITOR;
    case UserRole.VIEWER:
      return PrismaUserRole.VIEWER;
    default:
      return PrismaUserRole.VIEWER;
  }
}

export function prismaArticleStatusToDomain(
  status: PrismaArticleStatus,
): ArticleStatus {
  switch (status) {
    case PrismaArticleStatus.DRAFT:
      return ArticleStatus.DRAFT;
    case PrismaArticleStatus.PUBLISHED:
      return ArticleStatus.PUBLISHED;
    case PrismaArticleStatus.ARCHIVED:
      return ArticleStatus.ARCHIVED;
    default:
      return ArticleStatus.DRAFT;
  }
}

export function domainArticleStatusToPrisma(
  status: ArticleStatus,
): PrismaArticleStatus {
  switch (status) {
    case ArticleStatus.DRAFT:
      return PrismaArticleStatus.DRAFT;
    case ArticleStatus.PUBLISHED:
      return PrismaArticleStatus.PUBLISHED;
    case ArticleStatus.ARCHIVED:
      return PrismaArticleStatus.ARCHIVED;
    default:
      return PrismaArticleStatus.DRAFT;
  }
}

export type ArticleWithTags = Prisma.ArticleGetPayload<{
  include: { tags: true };
}>;

export function prismaArticleToDomain(row: ArticleWithTags): Article {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: prismaArticleStatusToDomain(row.status),
    authorId: row.authorId,
    categoryId: row.categoryId,
    tags: row.tags.map((t) => t.name),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function prismaUserToDomain(row: {
  id: string;
  login: string;
  password: string;
  role: PrismaUserRole;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: row.id,
    login: row.login,
    password: row.password,
    role: prismaRoleToDomain(row.role),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function prismaCategoryToDomain(row: {
  id: string;
  name: string;
  description: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}

export function prismaCommentToDomain(row: {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: Date;
}): Comment {
  return {
    id: row.id,
    content: row.content,
    articleId: row.articleId,
    authorId: row.authorId,
    createdAt: row.createdAt.getTime(),
  };
}
