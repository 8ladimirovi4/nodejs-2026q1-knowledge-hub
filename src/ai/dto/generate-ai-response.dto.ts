import { ApiProperty } from '@nestjs/swagger';

export class AiGeneratePromptResponseDto {
  @ApiProperty({
    description: 'Model plain-text reply.',
  })
  text: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Conversation id for follow-up turns. Echoed when sent in body, or minted when omitted.',
  })
  sessionId: string;
}
