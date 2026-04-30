import {
  SummarizeArticleDto,
  SummarizeArticleMaxLength,
} from '../dto/summarize-ai.dto';
import type { ArticleForPrompt } from './article-for-prompt';

const LENGTH_INSTRUCTION: Record<SummarizeArticleMaxLength, string> = {
  [SummarizeArticleMaxLength.SHORT]:
    'Keep the summary very brief: about two or three sentences. No bullet list unless the article is a pure list.',
  [SummarizeArticleMaxLength.MEDIUM]:
    'Aim for one moderate paragraph (roughly 120–200 words) covering the main ideas.',
  [SummarizeArticleMaxLength.DETAILED]:
    'Provide a thorough summary in several short paragraphs: main thesis, key arguments, conclusions. Do not invent facts or sources.',
};

export function buildSummarizePrompt(
  article: ArticleForPrompt,
  dto: SummarizeArticleDto,
): string {
  const tier = dto.maxLength ?? SummarizeArticleMaxLength.MEDIUM;
  const lengthRule = LENGTH_INSTRUCTION[tier];

  return [
    'You summarize articles for a technical knowledge base.',
    'Be faithful to the text. Use the same language as the article unless it mixes languages.',
    `Length: ${lengthRule}`,
    'Output plain text only. Do not prefix with phrases like "Here is the summary".',
    '',
    `Title: ${article.title}`,
    '',
    'Article:',
    article.content,
  ].join('\n');
}
