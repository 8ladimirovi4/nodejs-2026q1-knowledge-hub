import { IsEnum, IsOptional } from 'class-validator';

export enum SummarizeArticleMaxLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  DETAILED = 'detailed',
}

export class SummarizeArticleDto {
  @IsOptional()
  @IsEnum(SummarizeArticleMaxLength)
  maxLength?: SummarizeArticleMaxLength;
}
