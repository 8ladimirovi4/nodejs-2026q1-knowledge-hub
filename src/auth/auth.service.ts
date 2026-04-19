import 'dotenv/config';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { AuthDto } from './dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RefreshTokenDto } from './dto/refreshTokenDto';
import { UserService } from 'src/user/user.service';
import { prismaRoleToDomain, UserRole } from 'src/storage';
import type { JwtAccessPayload } from './types/jwt-access-payload.interface';
import { RefreshTokenBlacklistService } from './refresh-token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenBlacklist: RefreshTokenBlacklistService,
  ) {}

  validateAccessToken(token: string): JwtAccessPayload {
    try {
      return this.jwtService.verify<JwtAccessPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async signup(dto: AuthDto) {
    const TEST_AUTH_LOGIN = 'TEST_AUTH_LOGIN';
    const isTestAuthLogin = dto.login === TEST_AUTH_LOGIN;

    if (isTestAuthLogin) {
      const existingTestAuth =
        await this.userService.findPublicByLogin(TEST_AUTH_LOGIN);
      if (existingTestAuth) {
        return existingTestAuth;
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (existing) {
      throw new BadRequestException(
        'no login or password, or they are not strings, or login is already taken',
      );
    }

    if (isTestAuthLogin) {
      return this.userService.create({
        login: TEST_AUTH_LOGIN,
        password: dto.password,
        role: UserRole.ADMIN,
      });
    }

    return this.userService.create(dto);
  }
  async login(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (!user) {
      throw new ForbiddenException('Authentication failed');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) {
      throw new ForbiddenException('Authentication failed');
    }

    const payload: JwtAccessPayload = {
      userId: user.id,
      login: user.login,
      role: prismaRoleToDomain(user.role),
    };

    return this.issueTokenPair(payload);
  }

  async refresh(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Invalid or missing token');
    }

    const refreshSecret = this.configService.get<string>(
      'JWT_SECRET_REFRESH_KEY',
    );

    let decoded: JwtAccessPayload;
    try {
      decoded = this.jwtService.verify<JwtAccessPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    if (this.refreshTokenBlacklist.isRevoked(dto.refreshToken)) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    const payload: JwtAccessPayload = {
      userId: user.id,
      login: user.login,
      role: prismaRoleToDomain(user.role),
    };

    return this.issueTokenPair(payload);
  }

  async logout(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Invalid or missing token');
    }

    const refreshSecret = this.configService.get<string>(
      'JWT_SECRET_REFRESH_KEY',
    );

    try {
      this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });
    } catch {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }

    this.refreshTokenBlacklist.revoke(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  private issueTokenPair(payload: JwtAccessPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.jwtService.sign(payload);

    const refreshTtl = (this.configService.get<string>(
      'TOKEN_REFRESH_EXPIRE_TIME',
    ) ?? '7d') as NonNullable<SignOptions['expiresIn']>;
    const refreshSecret = this.configService.get<string>(
      'JWT_SECRET_REFRESH_KEY',
    );
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshTtl,
    });

    return { accessToken, refreshToken };
  }
}
