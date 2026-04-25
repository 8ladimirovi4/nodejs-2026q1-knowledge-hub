import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  applyOptionalPagination,
  type PaginatedList,
} from 'src/common/pagination/apply-pagination.util';
import { USER_LIST_SORT_KEYS } from 'src/common/sorting/list-sort.keys';
import { applyListSort } from 'src/common/sorting/list-sort.util';
import { requireSaltRounds } from 'src/common/utils';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { User } from '../storage/domain.types';
import { UserRole } from '../storage/domain.types';
import {
  domainRoleToPrisma,
  prismaUserToDomain,
} from '../storage/prisma-mappers';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtAccessPayload } from 'src/auth/types/jwt-access-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type PublicUser = Omit<User, 'password'>;

function isPrismaUniqueConstraintViolation(
  error: unknown,
): error is { code: 'P2002' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    sortBy?: string,
    order?: string,
    page?: string,
    limit?: string,
  ): Promise<PublicUser[] | PaginatedList<PublicUser>> {
    const rows = await this.prisma.user.findMany();
    const list = rows.map((u) => this.toPublic(prismaUserToDomain(u)));
    const sorted = applyListSort(list, sortBy, order, USER_LIST_SORT_KEYS);
    return applyOptionalPagination(sorted, page, limit);
  }

  async findOne(id: string): Promise<PublicUser> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    return this.toPublic(prismaUserToDomain(row));
  }

  async findPublicByLogin(login: string): Promise<PublicUser | null> {
    const row = await this.prisma.user.findUnique({ where: { login } });
    if (!row) {
      return null;
    }
    return this.toPublic(prismaUserToDomain(row));
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const role = dto.role ?? UserRole.VIEWER;
    const passwordHash = await bcrypt.hash(dto.password, requireSaltRounds());
    try {
      const row = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          login: dto.login,
          password: passwordHash,
          role: domainRoleToPrisma(role),
        },
      });
      return this.toPublic(prismaUserToDomain(row));
    } catch (e) {
      if (isPrismaUniqueConstraintViolation(e)) {
        throw new ConflictException('A user with this login already exists.');
      }
      throw e;
    }
  }

  async update(
    actor: JwtAccessPayload,
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUser> {
    if (actor.userId !== id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    if (dto.role !== undefined && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }

    const hasLogin = dto.login !== undefined;
    const hasRole = dto.role !== undefined;
    const hasOld = dto.oldPassword !== undefined;
    const hasNew = dto.newPassword !== undefined;
    const touchesPassword = hasOld || hasNew;

    if (!hasLogin && !hasRole && !touchesPassword) {
      throw new BadRequestException();
    }
    if (touchesPassword && (!hasOld || !hasNew)) {
      throw new BadRequestException();
    }

    const row = await this.prisma.user.findUnique({ where: { id } });

    if (!row) {
      throw new NotFoundException();
    }
    const user = prismaUserToDomain(row);

    const data: Prisma.UserUpdateInput = {};
    if (dto.login !== undefined) {
      if (dto.login !== user.login) {
        const taken = await this.prisma.user.findUnique({
          where: { login: dto.login },
        });

        if (taken) {
          throw new BadRequestException(
            'no login or password, or they are not strings, or login is already taken',
          );
        }
      }
      data.login = dto.login;
    }

    if (dto.role !== undefined) {
      data.role = domainRoleToPrisma(dto.role);
    }

    if (touchesPassword) {
      const match = await bcrypt.compare(dto.oldPassword!, user.password);
      if (!match) {
        throw new ForbiddenException();
      }
      data.password = await bcrypt.hash(dto.newPassword!, requireSaltRounds());
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.toPublic(prismaUserToDomain(updated));
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException();
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
    });
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
