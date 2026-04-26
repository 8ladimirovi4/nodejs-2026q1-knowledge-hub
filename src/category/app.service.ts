import { Injectable } from '@nestjs/common';
import { NotFoundError } from 'src/common/errors';
import {
  applyOptionalPagination,
  type PaginatedList,
} from 'src/common/pagination/apply-pagination.util';
import { CATEGORY_LIST_SORT_KEYS } from 'src/common/sorting/list-sort.keys';
import { applyListSort } from 'src/common/sorting/list-sort.util';
import { randomUUID } from 'crypto';
import type { Category } from 'src/storage/domain.types';
import { prismaCategoryToDomain } from 'src/storage/prisma-mappers';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/ceate-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    sortBy?: string,
    order?: string,
    page?: string,
    limit?: string,
  ): Promise<Category[] | PaginatedList<Category>> {
    const rows = await this.prisma.category.findMany();
    const list = rows.map(prismaCategoryToDomain);
    const sorted = applyListSort(list, sortBy, order, CATEGORY_LIST_SORT_KEYS);
    return applyOptionalPagination(sorted, page, limit);
  }

  async findOne(id: string): Promise<Category> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundError('Category not found');
    }
    return prismaCategoryToDomain(row);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const row = await this.prisma.category.create({
      data: {
        id: randomUUID(),
        name: dto.name,
        description: dto.description,
      },
    });
    return prismaCategoryToDomain(row);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Category not found');
    }
    const row = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
      },
    });
    return prismaCategoryToDomain(row);
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundError('Category not found');
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
