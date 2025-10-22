// src/modules/roles/dto/update-role.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsArray, IsOptional } from 'class-validator';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsArray()
  @IsOptional()
  permissionIds?: number[];
}