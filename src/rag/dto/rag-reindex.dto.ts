import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

const onlyPublishedDefaultTransform = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value === 'string') {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  }
  return value;
};

export class RagReIndexDto {
  @ApiPropertyOptional({
    description:
      'When true, include only published articles in the index. Omit for true (default).',
    default: true,
    example: true,
  })
  @IsOptional()
  @Transform(onlyPublishedDefaultTransform)
  @IsBoolean()
  onlyPublished?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional list of article ids to reindex. Omit to index according to scope rules.',
    type: String,
    isArray: true,
    format: 'uuid',
    example: ['a3f2c8d1-4b7e-4c91-9e2f-1d8a6b4c0e5f'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}
