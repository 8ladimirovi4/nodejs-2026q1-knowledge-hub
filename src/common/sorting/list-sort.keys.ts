export const USER_LIST_SORT_KEYS = [
  'id',
  'login',
  'role',
  'createdAt',
  'updatedAt',
] as const;

export const ARTICLE_LIST_SORT_KEYS = [
  'id',
  'title',
  'content',
  'status',
  'createdAt',
  'updatedAt',
  'authorId',
  'categoryId',
] as const;

export const CATEGORY_LIST_SORT_KEYS = [
  'id',
  'name',
  'description',
] as const;

export const COMMENT_LIST_SORT_KEYS = [
  'id',
  'content',
  'articleId',
  'authorId',
  'createdAt',
] as const;
