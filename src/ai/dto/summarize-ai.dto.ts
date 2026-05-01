import { IsEnum, IsOptional } from 'class-validator';

export enum SummarizeArticleMaxLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  DETAILED = 'detailed',
}

export type SummarizeArticleResponse = {
  articleId: string;
  summary: string;
  originalLength: number;
  summaryLength: number;
};

export class SummarizeArticleDto {
  @IsOptional()
  @IsEnum(SummarizeArticleMaxLength)
  maxLength?: SummarizeArticleMaxLength;
}
