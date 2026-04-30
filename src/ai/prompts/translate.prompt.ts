import { TranslateArticleDto } from '../dto/translate-ai.dto';
import type { ArticleForPrompt } from './article-for-prompt';

export function buildTranslatePrompt(
  article: ArticleForPrompt,
  dto: TranslateArticleDto,
): string {
  const sourceLine = dto.sourceLanguage
    ? `Assume the source language is "${dto.sourceLanguage}" unless the text obviously differs.`
    : 'Detect the source language from the text if relevant.';

  return [
    'You translate knowledge-base articles for readers.',
    `Translate the following article into: ${dto.targetLanguage}.`,
    sourceLine,
    'Preserve meaning, tone, and technical terms where appropriate. Do not omit paragraphs.',
    'Output plain text only: first line is the translated title, then a blank line, then the translated body.',
    '',
    `Original title: ${article.title}`,
    '',
    'Original article:',
    article.content,
  ].join('\n');
}
