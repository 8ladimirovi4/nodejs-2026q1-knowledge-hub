import { AiGeneratePromptDto } from '../dto/generate-ai.dto';

export function buildGeneratePrompt(dto: AiGeneratePromptDto): string {
  return [
    'Follow the user instruction below. Respond with plain text unless they explicitly request another format.',
    '',
    dto.prompt.trim(),
  ].join('\n');
}
