import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { User } from '../storage/domain.types';
import { UserRole } from '../storage/domain.types';
import { StorageFacade } from '../storage/storage.facade';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UserService {
  constructor(private readonly storage: StorageFacade) {}

  findAll(): PublicUser[] {
    return this.storage.users.getAll().map((u) => this.toPublic(u));
  }

  findOne(id: string): PublicUser {
    const user = this.storage.users.getById(id);
    if (!user) {
      throw new NotFoundException();
    }
    return this.toPublic(user);
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const now = Date.now();
    const role = dto.role ?? UserRole.VIEWER;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user: User = {
      id: randomUUID(),
      login: dto.login,
      password: passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.users.upsert(user);
    return this.toPublic(user);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    const user = this.storage.users.getById(id);
    if (!user) {
      throw new NotFoundException();
    }
    const match = await bcrypt.compare(dto.oldPassword, user.password);
    if (!match) {
      throw new ForbiddenException();
    }
    const updated: User = {
      ...user,
      password: await bcrypt.hash(dto.newPassword, 10),
      updatedAt: Date.now(),
    };
    this.storage.users.upsert(updated);
    return this.toPublic(updated);
  }

  async remove(id: string): Promise<void> {
    const user = this.storage.users.getById(id);
    if (!user) {
      throw new NotFoundException();
    }
    for (const article of this.storage.articles.getAll()) {
      if (article.authorId === id) {
        this.storage.articles.upsert({ ...article, authorId: null });
      }
    }
    for (const comment of this.storage.comments.getAll()) {
      if (comment.authorId === id) {
        this.storage.comments.delete(comment.id);
      }
    }
    this.storage.users.delete(id);
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
