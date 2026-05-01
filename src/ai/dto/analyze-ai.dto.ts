import { IsEnum, IsOptional } from 'class-validator';

export enum AnalyzeArticleTask {
  REVIEW = 'review',
  BUGS = 'bugs',
  OPTIMIZE = 'optimize',
  EXPLAIN = 'explain',
}

export enum AnalyzeArticleSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export type AnalyzeArticleResponse = {
  articleId: string;
  analysis: string;
  suggestions: string[];
  severity: AnalyzeArticleSeverity;
};

export type AnalyzeArticleModelPayload = {
  analysis: string;
  suggestions: string[];
  severity: AnalyzeArticleSeverity;
};

export const ANALYZE_RESPONSE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    severity: {
      type: 'string',
      enum: ['info', 'warning', 'error'],
      description:
        'Overall seriousness: info = minor/style; warning = notable gaps or confusion; error = serious contradictions or high-risk inaccuracies grounded in the text.',
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'string',
        description:
          'One concrete actionable bullet; no narrative duplication from analysis.',
      },
      description:
        'Ordered list of discrete improvements grounded in the article.',
    },
    analysis: {
      type: 'string',
      description:
        'Coherent review narrative (multiple short sections allowed). Ground only in the provided article.',
    },
  },
  required: ['severity', 'suggestions', 'analysis'],
};

export class AnalyzeArticleDto {
  @IsOptional()
  @IsEnum(AnalyzeArticleTask)
  task?: AnalyzeArticleTask;
}
