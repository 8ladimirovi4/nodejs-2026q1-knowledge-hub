import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../storage/domain.types';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  login?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  newPassword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
