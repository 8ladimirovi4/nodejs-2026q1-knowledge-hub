import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { RefreshTokenBlacklistService } from './refresh-token-blacklist.service';
import { UserRole } from 'src/storage/domain.types';
import type { JwtAccessPayload } from './types/jwt-access-payload.interface';

vi.mock('bcryptjs', () => ({
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

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  const userServiceMock = {
    findPublicByLogin: vi.fn(),
    create: vi.fn(),
  };
  const jwtServiceMock = {
    verify: vi.fn(),
    sign: vi.fn(),
    signAsync: vi.fn(),
  };
  const configServiceMock = {
    get: vi.fn(),
  };
  const refreshTokenBlacklistMock = {
    isRevoked: vi.fn(),
    revoke: vi.fn(),
    add: vi.fn(),
    has: vi.fn(),
  };
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
    vi.clearAllMocks();

    prismaMock = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock as unknown as PrismaService,
        },
        {
          provide: UserService,
          useValue: userServiceMock as unknown as UserService,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock as unknown as JwtService,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock as unknown as ConfigService,
        },
        {
          provide: RefreshTokenBlacklistService,
          useValue:
            refreshTokenBlacklistMock as unknown as RefreshTokenBlacklistService,
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccessToken', () => {
    it('returns decoded JwtAccessPayload when jwtService.verify succeeds', () => {
      const decoded: JwtAccessPayload = {
        userId: 'u-1',
        login: 'john',
        role: UserRole.EDITOR,
      };
      jwtServiceMock.verify.mockReturnValueOnce(decoded);

      const result = service.validateAccessToken('token');
      expect(result).toEqual(decoded);
      expect(jwtServiceMock.verify).toHaveBeenCalledWith('token');
    });

    it('throws UnauthorizedException when jwtService.verify throws', () => {
      jwtServiceMock.verify.mockImplementationOnce(() => {
        throw new Error('invalid token');
      });

      expect(() => service.validateAccessToken('bad-token')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('signup', () => {
    it('returns existing TEST_AUTH_LOGIN user when userService.findPublicByLogin finds it', async () => {
      const existingPublic = {
        id: 'existing-id',
        login: 'TEST_AUTH_LOGIN',
        role: UserRole.ADMIN,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      userServiceMock.findPublicByLogin.mockResolvedValueOnce(existingPublic);

      const result = await service.signup({
        login: 'TEST_AUTH_LOGIN',
        password: 'secret',
      });

      expect(result).toEqual(existingPublic);
      expect(userServiceMock.findPublicByLogin).toHaveBeenCalledWith(
        'TEST_AUTH_LOGIN',
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when prisma.user.findUnique finds duplicate login', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ login: 'duplicate' }),
      );

      await expect(
        service.signup({ login: 'duplicate', password: 'secret' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userServiceMock.create).not.toHaveBeenCalled();
    });

    it('creates TEST_AUTH_LOGIN with ADMIN role when test login has no existing user', async () => {
      userServiceMock.findPublicByLogin.mockResolvedValueOnce(null);
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      const created = {
        id: 'new-id',
        login: 'TEST_AUTH_LOGIN',
        role: UserRole.ADMIN,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      userServiceMock.create.mockResolvedValueOnce(created);

      const result = await service.signup({
        login: 'TEST_AUTH_LOGIN',
        password: 'secret',
      });

      expect(userServiceMock.create).toHaveBeenCalledWith({
        login: 'TEST_AUTH_LOGIN',
        password: 'secret',
        role: UserRole.ADMIN,
      });
      expect(result).toEqual(created);
    });

    it('creates regular user via userService.create for non-test login', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      const created = {
        id: 'new-id',
        login: 'john',
        role: UserRole.VIEWER,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      userServiceMock.create.mockResolvedValueOnce(created);

      const dto = { login: 'john', password: 'secret' };
      const result = await service.signup(dto);

      expect(userServiceMock.findPublicByLogin).not.toHaveBeenCalled();
      expect(userServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('login', () => {
    it('throws ForbiddenException when prisma.user.findUnique returns null', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ login: 'unknown', password: 'secret' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when bcrypt.compare returns false (wrong password)', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ login: 'john', password: 'hash' }),
      );
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => false);

      await expect(
        service.login({ login: 'john', password: 'wrong' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns accessToken/refreshToken when credentials are valid and issueTokenPair succeeds', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ login: 'john', role: PrismaUserRole.EDITOR }),
      );
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => true);
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET_REFRESH_KEY') return 'refresh-secret';
        if (key === 'TOKEN_REFRESH_EXPIRE_TIME') return '10d';
        return undefined;
      });

      const result = await service.login({ login: 'john', password: 'ok' });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(1, {
        userId: '11111111-1111-1111-1111-111111111111',
        login: 'john',
        role: UserRole.EDITOR,
      });
      expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(
        2,
        {
          userId: '11111111-1111-1111-1111-111111111111',
          login: 'john',
          role: UserRole.EDITOR,
        },
        {
          secret: 'refresh-secret',
          expiresIn: '10d',
        },
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refreshToken is missing in dto', async () => {
      await expect(service.refresh({})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws ForbiddenException when jwtService.verify fails for refresh token', async () => {
      configServiceMock.get.mockReturnValueOnce('refresh-secret');
      jwtServiceMock.verify.mockImplementationOnce(() => {
        throw new Error('bad refresh');
      });

      await expect(
        service.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when refresh token is already revoked in blacklist', async () => {
      configServiceMock.get.mockReturnValueOnce('refresh-secret');
      jwtServiceMock.verify.mockReturnValueOnce({
        userId: 'u-1',
        login: 'john',
        role: UserRole.VIEWER,
      });
      refreshTokenBlacklistMock.isRevoked.mockReturnValueOnce(true);

      await expect(
        service.refresh({ refreshToken: 'revoked-token' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when user from decoded payload does not exist', async () => {
      configServiceMock.get.mockReturnValueOnce('refresh-secret');
      jwtServiceMock.verify.mockReturnValueOnce({
        userId: 'u-1',
        login: 'john',
        role: UserRole.VIEWER,
      });
      refreshTokenBlacklistMock.isRevoked.mockReturnValueOnce(false);
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.refresh({ refreshToken: 'valid-token' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns new token pair when refresh token is valid and user exists', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET_REFRESH_KEY') return 'refresh-secret';
        if (key === 'TOKEN_REFRESH_EXPIRE_TIME') return '5d';
        return undefined;
      });
      jwtServiceMock.verify.mockReturnValueOnce({
        userId: 'u-1',
        login: 'john',
        role: UserRole.ADMIN,
      });
      refreshTokenBlacklistMock.isRevoked.mockReturnValueOnce(false);
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({
          id: 'u-1',
          login: 'john',
          role: PrismaUserRole.ADMIN,
        }),
      );
      jwtServiceMock.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh({ refreshToken: 'valid-token' });
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('throws UnauthorizedException when refreshToken is missing in dto', async () => {
      await expect(service.logout({})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws ForbiddenException when jwtService.verify fails for refresh token', async () => {
      configServiceMock.get.mockReturnValueOnce('refresh-secret');
      jwtServiceMock.verify.mockImplementationOnce(() => {
        throw new Error('bad refresh');
      });

      await expect(
        service.logout({ refreshToken: 'bad-token' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('revokes refresh token and returns success message when token is valid', async () => {
      configServiceMock.get.mockReturnValueOnce('refresh-secret');
      jwtServiceMock.verify.mockReturnValueOnce({
        userId: 'u-1',
        login: 'john',
        role: UserRole.VIEWER,
      });

      const result = await service.logout({ refreshToken: 'valid-token' });
      expect(refreshTokenBlacklistMock.revoke).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('issueTokenPair (covered indirectly)', () => {
    it('uses default refresh TTL (7d) when TOKEN_REFRESH_EXPIRE_TIME config is undefined', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ login: 'john' }),
      );
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => true);
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET_REFRESH_KEY') return 'refresh-secret';
        if (key === 'TOKEN_REFRESH_EXPIRE_TIME') return undefined;
        return undefined;
      });
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.login({ login: 'john', password: 'secret' });
      expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
    });

    it('uses configured refresh secret and configured refresh TTL when provided', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(
        makePrismaUserRow({ login: 'john' }),
      );
      vi.mocked(bcrypt.compare).mockImplementationOnce(async () => true);
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET_REFRESH_KEY') return 'custom-secret';
        if (key === 'TOKEN_REFRESH_EXPIRE_TIME') return '30d';
        return undefined;
      });
      jwtServiceMock.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await service.login({ login: 'john', password: 'secret' });
      expect(jwtServiceMock.sign).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        {
          secret: 'custom-secret',
          expiresIn: '30d',
        },
      );
    });
  });
});
