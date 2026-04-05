import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ArticleStatus } from 'src/storage/domain.types';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? undefined : value;

export class FindArticlesQueryDto {
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @IsNotEmpty()
  tag?: string;
}
