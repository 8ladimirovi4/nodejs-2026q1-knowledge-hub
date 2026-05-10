import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AiGeneratePromptDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Conversation thread id. Omit to start a new thread (server returns minted id).',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;
}
