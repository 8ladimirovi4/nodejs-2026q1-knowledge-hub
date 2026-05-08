import { ArticleStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const limitDefaultTransform = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return 5;
  }
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  return value;
};

export class RagSearchDto {
  @ApiProperty({
    description: 'Semantic search query over Knowledge Hub article chunks.',
    example: 'How is JWT authentication configured?',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description:
      'Maximum number of hits to return. Omitted values default to 5; upper bound is 20.',
    default: 5,
    minimum: 1,
    maximum: 20,
    example: 5,
  })
  @Transform(limitDefaultTransform)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    enum: ArticleStatus,
    description: 'Optional filter by article lifecycle status.',
    example: ArticleStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  articleStatus?: ArticleStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional filter by article category id.',
    example: '795fe242-3e2a-4374-9dd9-a9510ca1bb73',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Optional filter by article tags.',
    type: String,
    isArray: true,
    example: ['nestjs', 'rag'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
