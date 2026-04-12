import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  applyOptionalPagination,
  type PaginatedList,
} from 'src/common/pagination/apply-pagination.util';
import { USER_LIST_SORT_KEYS } from 'src/common/sorting/list-sort.keys';
import { applyListSort } from 'src/common/sorting/list-sort.util';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { User } from '../storage/domain.types';
import { UserRole } from '../storage/domain.types';
import {
  domainRoleToPrisma,
  prismaUserToDomain,
} from '../storage/prisma-mappers';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

export type PublicUser = Omit<User, 'password'>;

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

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const role = dto.role ?? UserRole.VIEWER;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const row = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        login: dto.login,
        password: passwordHash,
        role: domainRoleToPrisma(role),
      },
    });
    return this.toPublic(prismaUserToDomain(row));
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    const user = prismaUserToDomain(row);
    const match = await bcrypt.compare(dto.oldPassword, user.password);
    if (!match) {
      throw new ForbiddenException();
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(dto.newPassword, 10),
      },
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

  private toPublic(user: User): PublicUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
