// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsInt, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsInt()
  roleId: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}