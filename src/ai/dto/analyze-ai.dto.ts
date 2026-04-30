import { IsEnum, IsOptional } from 'class-validator';

export enum AnalyzeArticleTask {
  REVIEW = 'review',
  BUGS = 'bugs',
  OPTIMIZE = 'optimize',
  EXPLAIN = 'explain',
}

export class AnalyzeArticleDto {
  @IsOptional()
  @IsEnum(AnalyzeArticleTask)
  task?: AnalyzeArticleTask;
}
