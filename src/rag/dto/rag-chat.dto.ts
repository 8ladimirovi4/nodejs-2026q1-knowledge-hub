import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RagChatDto {
  @ApiProperty({
    description: 'User question to answer with grounded Knowledge Hub context.',
    example: 'What authentication approach does the hub recommend?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Existing RAG conversation id to continue. Omit to start a new conversation.',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;
}
