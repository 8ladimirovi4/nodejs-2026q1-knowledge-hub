import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { ArticleService } from './app.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleStatus, UserRole } from 'src/storage/domain.types';

function createPrismaMock() {
  return {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({ article: { update: vi.fn(), delete: vi.fn() } }),
    ),
  };
}

describe('ArticleService', () => {
  let service: ArticleService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  const makeArticleRow = (
    overrides?: Partial<{
      id: string;
      title: string;
      content: string;
      status: PrismaArticleStatus;
      authorId: string | null;
      categoryId: string | null;
      tags: Array<{ name: string }>;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) => ({
    id: '11111111-1111-1111-1111-111111111111',
    title: 'default title',
    content: 'default content',
    status: PrismaArticleStatus.DRAFT,
    authorId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    categoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    tags: [{ name: 'nestjs' }],
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:05:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: prismaMock as unknown as PrismaService,
        },
      ],
    }).compile();
    service = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('builds where filter by status/categoryId/tag and returns mapped list', async () => {
      const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const tag = 'backend';
      prismaMock.article.findMany.mockResolvedValueOnce([
        makeArticleRow({
          status: PrismaArticleStatus.PUBLISHED,
          categoryId,
          tags: [{ name: tag }],
        }),
      ]);

      const result = await service.findAll({
        status: ArticleStatus.PUBLISHED,
        categoryId,
        tag,
      });

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: {
          status: PrismaArticleStatus.PUBLISHED,
          categoryId,
          tags: { some: { name: tag } },
        },
        include: { tags: true },
      });
      expect(result).toEqual([
        expect.objectContaining({
          status: ArticleStatus.PUBLISHED,
          categoryId,
          tags: [tag],
        }),
      ]);
    });

    it('applies sorting and optional pagination', async () => {
      prismaMock.article.findMany.mockResolvedValueOnce([
        makeArticleRow({ id: '1', title: 'zeta' }),
        makeArticleRow({ id: '2', title: 'alpha' }),
      ]);

      const result = await service.findAll({}, 'title', 'asc', '1', '2');
      expect(result).toEqual({
        total: 2,
        page: 1,
        limit: 2,
        data: [
          expect.objectContaining({ title: 'alpha' }),
          expect.objectContaining({ title: 'zeta' }),
        ],
      });
    });

    it('returns empty list when no rows match filters', async () => {
      prismaMock.article.findMany.mockResolvedValueOnce([]);
      await expect(service.findAll({})).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns mapped article with tags when row exists', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, tags: [{ name: 'api' }, { name: 'testing' }] }),
      );

      const result = await service.findOne(id);
      expect(result).toEqual(
        expect.objectContaining({
          id,
          tags: ['api', 'testing'],
        }),
      );
      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { tags: true },
      });
    });

    it('throws NotFoundException when article does not exist', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      prismaMock.article.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('uses actor.userId as authorId for non-admin actor', async () => {
      const actor = {
        userId: 'actor-id',
        login: 'editor-login',
        role: UserRole.EDITOR,
      };
      const dto = {
        title: 'new article',
        content: 'body',
        authorId: 'another-user-id',
      };
      prismaMock.article.create.mockResolvedValueOnce(
        makeArticleRow({ authorId: actor.userId }),
      );

      await service.create(actor, dto);
      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          title: 'new article',
          content: 'body',
          status: PrismaArticleStatus.DRAFT,
          authorId: 'actor-id',
          categoryId: null,
          tags: { connectOrCreate: [] },
        },
        include: { tags: true },
      });
    });

    it('uses dto.authorId for admin actor when provided', async () => {
      const admin = {
        userId: 'admin-id',
        login: 'admin',
        role: UserRole.ADMIN,
      };
      const dto = {
        title: 'new article',
        content: 'body',
        authorId: 'target-author-id',
        status: ArticleStatus.PUBLISHED,
        categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        tags: ['nestjs', 'unit'],
      };
      prismaMock.article.create.mockResolvedValueOnce(
        makeArticleRow({
          status: PrismaArticleStatus.PUBLISHED,
          authorId: 'target-author-id',
          categoryId: dto.categoryId,
          tags: [{ name: 'nestjs' }, { name: 'unit' }],
        }),
      );

      const result = await service.create(admin, dto);
      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          title: dto.title,
          content: dto.content,
          status: PrismaArticleStatus.PUBLISHED,
          authorId: 'target-author-id',
          categoryId: dto.categoryId,
          tags: {
            connectOrCreate: [
              {
                where: { name: 'nestjs' },
                create: { name: 'nestjs' },
              },
              {
                where: { name: 'unit' },
                create: { name: 'unit' },
              },
            ],
          },
        },
        include: { tags: true },
      });
      expect(result).toEqual(
        expect.objectContaining({
          authorId: 'target-author-id',
          status: ArticleStatus.PUBLISHED,
          tags: ['nestjs', 'unit'],
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when existing article is missing', async () => {
      prismaMock.article.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update(
          { userId: 'u1', login: 'u1', role: UserRole.ADMIN },
          'missing-id',
          { title: 'new title' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when non-admin is not article owner', async () => {
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ authorId: 'owner-id' }),
      );

      await expect(
        service.update(
          { userId: 'another-user', login: 'editor', role: UserRole.EDITOR },
          'article-id',
          { title: 'new title' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin and updates scalar fields', async () => {
      const id = 'article-id';
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: 'owner-id' }),
      );
      const txUpdate = vi.fn().mockResolvedValue(undefined);
      prismaMock.$transaction.mockImplementationOnce(async (fn) =>
        fn({ article: { update: txUpdate } }),
      );
      prismaMock.article.findUniqueOrThrow.mockResolvedValueOnce(
        makeArticleRow({
          id,
          title: 'updated title',
          content: 'updated content',
          status: PrismaArticleStatus.ARCHIVED,
        }),
      );

      const result = await service.update(
        { userId: 'admin-id', login: 'admin', role: UserRole.ADMIN },
        id,
        {
          title: 'updated title',
          content: 'updated content',
          status: ArticleStatus.ARCHIVED,
        },
      );

      expect(txUpdate).toHaveBeenCalledWith({
        where: { id },
        data: {
          title: 'updated title',
          content: 'updated content',
          status: PrismaArticleStatus.ARCHIVED,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id,
          title: 'updated title',
          status: ArticleStatus.ARCHIVED,
        }),
      );
    });

    it('disconnects category when categoryId is null', async () => {
      const id = 'article-id';
      const owner = {
        userId: 'owner-id',
        login: 'owner',
        role: UserRole.EDITOR,
      };
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: owner.userId }),
      );
      const txUpdate = vi.fn().mockResolvedValue(undefined);
      prismaMock.$transaction.mockImplementationOnce(async (fn) =>
        fn({ article: { update: txUpdate } }),
      );
      prismaMock.article.findUniqueOrThrow.mockResolvedValueOnce(
        makeArticleRow({ id, categoryId: null }),
      );

      await service.update(owner, id, { categoryId: null });
      expect(txUpdate).toHaveBeenCalledWith({
        where: { id },
        data: { category: { disconnect: true } },
      });
    });

    it('connects category when categoryId is provided', async () => {
      const id = 'article-id';
      const categoryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const owner = {
        userId: 'owner-id',
        login: 'owner',
        role: UserRole.EDITOR,
      };
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: owner.userId }),
      );
      const txUpdate = vi.fn().mockResolvedValue(undefined);
      prismaMock.$transaction.mockImplementationOnce(async (fn) =>
        fn({ article: { update: txUpdate } }),
      );
      prismaMock.article.findUniqueOrThrow.mockResolvedValueOnce(
        makeArticleRow({ id, categoryId }),
      );

      await service.update(owner, id, { categoryId });
      expect(txUpdate).toHaveBeenCalledWith({
        where: { id },
        data: { category: { connect: { id: categoryId } } },
      });
    });

    it('replaces tags and skips scalar update when only tags are provided', async () => {
      const id = 'article-id';
      const owner = {
        userId: 'owner-id',
        login: 'owner',
        role: UserRole.EDITOR,
      };
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: owner.userId }),
      );
      const txUpdate = vi.fn().mockResolvedValue(undefined);
      prismaMock.$transaction.mockImplementationOnce(async (fn) =>
        fn({ article: { update: txUpdate } }),
      );
      prismaMock.article.findUniqueOrThrow.mockResolvedValueOnce(
        makeArticleRow({ id, tags: [{ name: 'tag1' }, { name: 'tag2' }] }),
      );

      await service.update(owner, id, { tags: ['tag1', 'tag2'] });
      expect(txUpdate).toHaveBeenCalledTimes(2);
      expect(txUpdate).toHaveBeenNthCalledWith(1, {
        where: { id },
        data: { tags: { set: [] } },
      });
      expect(txUpdate).toHaveBeenNthCalledWith(2, {
        where: { id },
        data: {
          tags: {
            connectOrCreate: [
              { where: { name: 'tag1' }, create: { name: 'tag1' } },
              { where: { name: 'tag2' }, create: { name: 'tag2' } },
            ],
          },
        },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when article is missing', async () => {
      prismaMock.article.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.remove(
          { userId: 'u1', login: 'admin', role: UserRole.ADMIN },
          'missing',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when non-admin is not owner', async () => {
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ authorId: 'owner-id' }),
      );
      await expect(
        service.remove(
          { userId: 'another-user', login: 'editor', role: UserRole.EDITOR },
          'article-id',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deletes article when actor is admin', async () => {
      const id = 'article-id';
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: 'owner-id' }),
      );

      await expect(
        service.remove(
          { userId: 'admin-id', login: 'admin', role: UserRole.ADMIN },
          id,
        ),
      ).resolves.toBeUndefined();
      expect(prismaMock.article.delete).toHaveBeenCalledWith({ where: { id } });
    });

    it('deletes article when actor is owner', async () => {
      const id = 'article-id';
      const owner = {
        userId: 'owner-id',
        login: 'owner',
        role: UserRole.EDITOR,
      };
      prismaMock.article.findUnique.mockResolvedValueOnce(
        makeArticleRow({ id, authorId: owner.userId }),
      );

      await expect(service.remove(owner, id)).resolves.toBeUndefined();
      expect(prismaMock.article.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });
});
