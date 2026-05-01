import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type TranslateArticleResponse = {
  articleId: string;
  translatedText: string;
  detectedLanguage: string;
};

export type TranslateArticleModelPayload = {
  translatedText: string;
  detectedLanguage: string;
};

export const TRANSLATE_RESPONSE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    detectedLanguage: {
      type: 'string',
      description:
        'Language of the original (source) article: ISO 639-1 code or short English name (e.g. en, German).',
    },
    translatedText: {
      type: 'string',
      description:
        'Full translation as plain text: translated title on the first line, then a blank line, then the translated body.',
    },
  },
  required: ['detectedLanguage', 'translatedText'],
};

export class TranslateArticleDto {
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @IsOptional()
  @IsString()
  sourceLanguage?: string;
}
