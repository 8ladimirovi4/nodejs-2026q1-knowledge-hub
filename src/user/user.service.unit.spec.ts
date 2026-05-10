import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from 'src/common/errors';
import { UserRole as PrismaUserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { requireSaltRounds } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../storage/domain.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-for-tests'),
  compare: vi.fn().mockResolvedValue(true),
}));

function createPrismaMock() {
  return {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({ user: { delete: vi.fn() } })),
  };
}

describe('UserService', () => {
  let service: UserService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  const makePrismaUserRow = (
    overrides?: Partial<{
      id: string;
      login: string;
      password: string;
      role: PrismaUserRole;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) => ({
    id: '11111111-1111-1111-1111-111111111111',
    login: 'user-login',
    password: 'stored-password-hash',
    role: PrismaUserRole.VIEWER,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:05:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    vi.stubEnv('CRYPT_SALT', '10');
    vi.mocked(bcrypt.hash).mockClear();
    vi.mocked(bcrypt.compare).mockClear();

    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaMock as unknown as PrismaService,
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes password, assigns default VIEWER, persists and returns public user', async () => {
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:05:00.000Z');
      prismaMock.user.create.mockImplementation(async ({ data }) => ({
        id: data.id,
        login: data.login,
        password: data.password,
        role: data.role,
        createdAt,
        updatedAt,
      }));

      const dto: CreateUserDto = { login: 'newuser', password: 'plain-secret' };
      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'plain-secret',
        requireSaltRounds(),
      );
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String) as string,
          login: 'newuser',
          password: 'hashed-for-tests',
          role: PrismaUserRole.VIEWER,
        },
      });
      expect(result).toEqual({
        id: expect.any(String) as string,
        login: 'newuser',
        role: UserRole.VIEWER,
        createdAt: createdAt.getTime(),
        updatedAt: updatedAt.getTime(),
      });
      expect(result).not.toHaveProperty('password');
    });

    it('uses explicit role from dto', async () => {
      const createdAt = new Date();
      const updatedAt = new Date();
      prismaMock.user.create.mockImplementation(async ({ data }) => ({
        id: data.id,
        login: data.login,
        password: data.password,
        role: data.role,
        createdAt,
        updatedAt,
      }));

      const dto: CreateUserDto = {
        login: 'editor-user',
        password: 'p',
        role: UserRole.EDITOR,
      };
      const result = await service.create(dto);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String) as string,
          login: 'editor-user',
          password: 'hashed-for-tests',
          role: PrismaUserRole.EDITOR,
        },
      });
      expect(result.role).toBe(UserRole.EDITOR);
    });

    it('throws ConflictException when login already exists (Prisma P2002)', async () => {
      const uniqueConstraintError = Object.assign(
        new Error('Unique constraint failed on the fields: (`login`)'),
        { code: 'P2002' as const },
      );
      prismaMock.user.create.mockRejectedValueOnce(uniqueConstraintError);

      const dto: CreateUserDto = {
        login: 'existing-login1',
        password: 'secret',
      };

      let err = null;
      try {
        await service.create(dto);
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toEqual(
        expect.objectContaining({
          message: 'A user with this login already exists.',
          statusCode: 409,
        }),
      );
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });

    it('rethrows non-P2002 errors from prisma create', async () => {
      const dbError = new Error('db unavailable');
      prismaMock.user.create.mockRejectedValueOnce(dbError);

      await expect(
        service.create({ login: 'new-login', password: 'secret' }),
      ).rejects.toBe(dbError);
    });
  });

  describe('findAll', () => {
    const threePrismaUsers = () => [
      {
        id: '11111111-1111-1111-1111-111111111111',
        login: 'alice',
        password: 'hash-a',
        role: PrismaUserRole.EDITOR,
        createdAt: new Date('2024-01-10T00:00:00.000Z'),
        updatedAt: new Date('2024-01-10T12:00:00.000Z'),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        login: 'bob',
        password: 'hash-b',
        role: PrismaUserRole.VIEWER,
        createdAt: new Date('2024-01-11T00:00:00.000Z'),
        updatedAt: new Date('2024-01-11T00:00:00.000Z'),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        login: 'carol',
        password: 'hash-c',
        role: PrismaUserRole.ADMIN,
        createdAt: new Date('2024-01-12T00:00:00.000Z'),
        updatedAt: new Date('2024-01-12T00:00:00.000Z'),
      },
    ];

    it('maps rows to public users, applies sort by distinct field values, optional pagination', async () => {
      prismaMock.user.findMany.mockImplementation(() => threePrismaUsers());

      const withDefaultOrder = await service.findAll();
      expect(withDefaultOrder).toHaveLength(3);
      expect(withDefaultOrder[0]).not.toHaveProperty('password');
      expect(
        (withDefaultOrder as { login: string }[]).map((u) => u.login),
      ).toEqual(['alice', 'bob', 'carol']);

      const byLoginDesc = await service.findAll('login', 'desc');
      expect((byLoginDesc as { login: string }[]).map((u) => u.login)).toEqual([
        'carol',
        'bob',
        'alice',
      ]);

      const page1 = await service.findAll(undefined, undefined, '1', '2');
      expect(page1).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        data: expect.arrayContaining([
          expect.objectContaining({ login: 'alice' }),
          expect.objectContaining({ login: 'bob' }),
        ]),
      });
      expect((page1 as { data: { login: string }[] }).data).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundError when user does not exist (findUnique returns null)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const id = '11111111-1111-1111-1111-111111111111';
      await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundError);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('returns public user when record exists', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({
          id,
          login: 'existing-login',
          role: PrismaUserRole.EDITOR,
        }),
      );

      const result = await service.findOne(id);
      expect(result).toEqual(
        expect.objectContaining({
          id,
          login: 'existing-login',
          role: UserRole.EDITOR,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findPublicByLogin', () => {
    it('returns null when login is not found (no exception)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const login = 'no-such-user';
      await expect(service.findPublicByLogin(login)).resolves.toBeNull();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { login },
      });
    });

    it('returns public user when login exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({
          login: 'existing-login',
          role: PrismaUserRole.ADMIN,
        }),
      );

      const result = await service.findPublicByLogin('existing-login');
      expect(result).toEqual(
        expect.objectContaining({
          login: 'existing-login',
          role: UserRole.ADMIN,
        }),
      );
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('update', () => {
    it('throws ForbiddenError when actor cannot edit user (not admin, not owner)', async () => {
      const dto = { login: 'new_login' };
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: '22222222-2222-2222-2222-222222222222',
        login: 'actor_login',
        role: UserRole.EDITOR,
      };

      await expect(service.update(actor, id, dto)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('throws ForbiddenError when non-admin tries to change role', async () => {
      const dto = { role: UserRole.ADMIN };
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: id,
        login: 'owner_login',
        role: UserRole.VIEWER,
      };

      await expect(service.update(actor, id, dto)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws ValidationError when dto has no updatable fields', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: id,
        login: 'owner_login',
        role: UserRole.ADMIN,
      };

      await expect(service.update(actor, id, {})).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws ValidationError when password change is partial', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: id,
        login: 'owner_login',
        role: UserRole.ADMIN,
      };

      await expect(
        service.update(actor, id, { oldPassword: 'old-only' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when user id does not exist', async () => {
      const dto = { role: UserRole.VIEWER };
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: '22222222-2222-2222-2222-222222222222',
        login: 'actor_login',
        role: UserRole.ADMIN,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.update(actor, id, dto)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });
    it('throws ValidationError when new login is already taken', async () => {
      const dto = { login: 'existing_login' };
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: '22222222-2222-2222-2222-222222222222',
        login: 'actor_login',
        role: UserRole.ADMIN,
      };
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:05:00.000Z');

      prismaMock.user.findUnique
        .mockResolvedValueOnce({
          id: '11111111-1111-1111-1111-111111111111',
          login: 'user_login',
          password: 'hashed_password',
          role: PrismaUserRole.ADMIN,
          createdAt,
          updatedAt,
        })
        .mockResolvedValueOnce({
          id: '22222222-2222-2222-2222-222222222222',
          login: 'existing_login',
          password: 'hashed_password_2',
          role: PrismaUserRole.VIEWER,
          createdAt,
          updatedAt,
        });

      await expect(service.update(actor, id, dto)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id },
      });
      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { login: 'existing_login' },
      });
    });
    it('password change: bcrypt.compare + hash with requireSaltRounds; wrong old password → Forbidden', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: '11111111-1111-1111-1111-111111111111',
        login: 'owner_login',
        role: UserRole.VIEWER,
      };
      const dto = {
        oldPassword: 'wrong-old-password',
        newPassword: 'new-password',
      };
      const createdAt = new Date('2024-01-15T10:00:00.000Z');
      const updatedAt = new Date('2024-01-15T10:05:00.000Z');

      prismaMock.user.findUnique.mockResolvedValueOnce({
        id,
        login: 'owner_login',
        password: 'stored-password-hash',
        role: PrismaUserRole.VIEWER,
        createdAt,
        updatedAt,
      });
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => false);

      await expect(service.update(actor, id, dto)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrong-old-password',
        'stored-password-hash',
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('updates login without duplicate lookup when login is unchanged', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: id,
        login: 'same-login',
        role: UserRole.ADMIN,
      };
      const row = makePrismaUserRow({ id, login: 'same-login' });
      prismaMock.user.findUnique.mockResolvedValueOnce(row);
      prismaMock.user.update.mockResolvedValueOnce({
        ...row,
        updatedAt: new Date('2024-01-16T10:05:00.000Z'),
      });

      const result = await service.update(actor, id, { login: 'same-login' });
      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { login: 'same-login' },
      });
      expect(result.login).toBe('same-login');
    });

    it('updates password when old password matches', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      const actor = {
        userId: id,
        login: 'owner_login',
        role: UserRole.VIEWER,
      };
      const row = makePrismaUserRow({ id, login: 'owner_login' });
      prismaMock.user.findUnique.mockResolvedValueOnce(row);
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => true);
      prismaMock.user.update.mockResolvedValueOnce({
        ...row,
        password: 'hashed-for-tests',
        updatedAt: new Date('2024-01-17T10:05:00.000Z'),
      });

      const result = await service.update(actor, id, {
        oldPassword: 'correct-old',
        newPassword: 'new-secret',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-old',
        'stored-password-hash',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(
        'new-secret',
        requireSaltRounds(),
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { password: 'hashed-for-tests' },
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('remove', () => {
    it('throws NotFoundError when user does not exist before delete', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundError);
      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id },
      });
    });

    it('deletes user inside transaction when record exists', async () => {
      const id = '11111111-1111-1111-1111-111111111111';
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ id }),
      );
      const txDelete = vi.fn().mockResolvedValue(undefined);
      prismaMock.$transaction.mockImplementationOnce(
        async (
          fn: (tx: { user: { delete: typeof txDelete } }) => Promise<void>,
        ) => {
          await fn({ user: { delete: txDelete } });
        },
      );

      await expect(service.remove(id)).resolves.toBeUndefined();
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txDelete).toHaveBeenCalledWith({ where: { id } });
    });
  });
});
