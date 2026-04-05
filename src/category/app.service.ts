import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Category } from 'src/storage/domain.types';
import { StorageFacade } from 'src/storage';
import { CreateCategoryDto } from './dto/ceate-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly storage: StorageFacade) {}

  findAll(): Category[] {
    return this.storage.categories.getAll();
  }

  findOne(id: string): Category {
    const category = this.storage.categories.getById(id);
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  create(dto: CreateCategoryDto): Category {
    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
    };
    this.storage.categories.upsert(category);
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): Category {
    const category = this.storage.categories.getById(id);
    if (!category) {
      throw new NotFoundException();
    }
    const updated: Category = {
      ...category,
      name: dto.name ?? category.name,
      description: dto.description ?? category.description,
    };
    this.storage.categories.upsert(updated);
    return updated;
  }

  remove(id: string): void {
    const category = this.storage.categories.getById(id);
    if (!category) {
      throw new NotFoundException();
    }
    for (const article of this.storage.articles.getAll()) {
      if (article.categoryId === id) {
        this.storage.articles.upsert({ ...article, categoryId: null });
      }
    }
    this.storage.categories.delete(id);
  }
}
