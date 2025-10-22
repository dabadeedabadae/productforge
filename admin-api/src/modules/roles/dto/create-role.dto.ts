// src/modules/roles/dto/create-role.dto.ts
import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  permissionIds: number[];
}