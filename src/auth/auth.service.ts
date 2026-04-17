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
import { prismaRoleToDomain } from 'src/storage';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async signup(dto: AuthDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (existing) {
      throw new BadRequestException(
        'no login or password, or they are not strings, or login is already taken',
      );
    }
    await this.userService.create(dto);
    return { message: 'User created successfully' };
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

    const payload = {
      userId: user.id,
      login: user.login,
      role: prismaRoleToDomain(user.role),
    };

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
  async refresh(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Invalid or missing token');
    }

    //TBD
    const mockTocken = true;
    if (!mockTocken) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }
    return { accessToken: 'TBD', refreshToken: 'TBD' };
  }
}
