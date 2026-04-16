import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { RefreshTokenDto } from './dto/refreshTokenDto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async signup(dto: AuthDto) {
    const existing = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });

    if (existing) {
      throw new BadRequestException(
        'no login or password, or they are not strings, or login is already taken',
      );
    }
    //TBD
    return 'sign up succesfull';
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

    return { accessToken: 'TBD', refreshToken: 'TBD' };
  }
  async refresh(dto: RefreshTokenDto) {

    if(!dto.refreshToken){
      throw new UnauthorizedException('Invalid or missing token');
    }
    
    //TBD
    const mockTocken = true
    if (!mockTocken) {
      throw new ForbiddenException('Refresh token is invalid or expired');
    }
    return { accessToken: 'TBD', refreshToken: 'TBD' };
  }  
}
