import { IsNotEmpty, IsString } from 'class-validator';

export class AiGeneratePromptDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
