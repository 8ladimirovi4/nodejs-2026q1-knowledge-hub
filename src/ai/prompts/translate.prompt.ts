import { TranslateArticleDto } from '../dto/translate-ai.dto';
import type { ArticleForPrompt } from './article-for-prompt';

export function buildTranslatePrompt(
  article: ArticleForPrompt,
  dto: TranslateArticleDto,
): string {
  const sourceLine = dto.sourceLanguage
    ? `Assume the source language is "${dto.sourceLanguage}" unless the text obviously differs.`
    : 'Detect the source language from the text if relevant.';

  const detectedHint = dto.sourceLanguage
    ? `Set JSON field detectedLanguage exactly to "${dto.sourceLanguage}".`
    : `Set detectedLanguage to the language of the source article (ISO 639-1 or short English name).`;

  return [
    'You translate knowledge-base articles for readers.',
    `Translate the following article into: ${dto.targetLanguage}.`,
    sourceLine,
    'Preserve meaning, tone, and technical terms where appropriate. Do not omit paragraphs.',
    'Do not repeat the same sentence or paragraph multiple times at the end; stop when the full article is translated once.',
    'Respond ONLY with JSON matching the schema supplied by the API (no prose, no markdown).',
    translatedTextMustBeStructured(),
    detectedHint,
    '',
    `Original title: ${article.title}`,
    '',
    'Original article:',
    article.content,
  ].join('\n');
}

function translatedTextMustBeStructured(): string {
  return (
    'translatedText must contain plain text inside the JSON string only: translated title first line,' +
    ' then a blank line, then full translated body (same structure as plain-text output previously).'
  );
}
