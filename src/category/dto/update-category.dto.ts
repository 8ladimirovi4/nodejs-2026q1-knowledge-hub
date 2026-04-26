import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './ceate-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
