import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiUsageTokensDto {
  @ApiProperty({ example: 1200 })
  prompt: number;

  @ApiProperty({ example: 340 })
  candidates: number;

  @ApiProperty({ example: 1540 })
  total: number;
}

export class AiUsageResponseDto {
  @ApiProperty({ example: 42 })
  totalRequests: number;

  @ApiProperty({
    example: {
      'POST /ai/generate': 1,
      'POST /ai/articles/:articleId/summarize': 10,
    },
  })
  requestsByEndpoint: Record<string, number>;

  @ApiPropertyOptional({ type: AiUsageTokensDto })
  tokens?: AiUsageTokensDto;
}
