import { AnalyzeArticleDto, AnalyzeArticleTask } from '../dto/analyze-ai.dto';
import type { ArticleForPrompt } from './article-for-prompt';

const TASK_FOCUS: Record<AnalyzeArticleTask, string> = {
  [AnalyzeArticleTask.REVIEW]:
    'Write a short editorial review: clarity, structure, strengths, gaps, and concrete improvement suggestions.',
  [AnalyzeArticleTask.BUGS]:
    'Look for possible technical inaccuracies, ambiguous statements, or internal contradictions. Flag speculative claims. Do not fabricate facts.',
  [AnalyzeArticleTask.OPTIMIZE]:
    'Suggest how to reorganize or tighten the article for readers (headings, flow, redundancy). Keep suggestions actionable.',
  [AnalyzeArticleTask.EXPLAIN]:
    'Explain the article in simpler language for someone new to the topic. Keep it shorter than the original unless complexity requires more.',
};

export function buildAnalyzePrompt(
  article: ArticleForPrompt,
  dto: AnalyzeArticleDto,
): string {
  const task = dto.task ?? AnalyzeArticleTask.REVIEW;
  const focus = TASK_FOCUS[task];

  return [
    'You analyze articles in a knowledge hub.',
    `Task: ${task}.`,
    focus,
    'Ground everything only in the provided text. Do not invent facts or external citations.',
    'Respond ONLY with JSON matching the schema supplied by the API (no markdown fences, no prose outside JSON).',
    'Fill suggestions[] with concise standalone strings (actions or fixes). Put substantive narrative only in analysis.',
    '',
    `Title: ${article.title}`,
    '',
    'Article:',
    article.content,
  ].join('\n');
}
