import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'JWT refresh token',
    example: 'string',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
