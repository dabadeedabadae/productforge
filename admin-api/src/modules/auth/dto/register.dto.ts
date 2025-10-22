// src/modules/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, IsInt } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsInt()
  roleId: number;
}