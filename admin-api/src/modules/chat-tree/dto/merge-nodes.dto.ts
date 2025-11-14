import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class MergeNodesDto {
  @IsOptional()
  @IsString()
  baseNodeId?: string;

  @IsString()
  leftNodeId!: string;

  @IsString()
  rightNodeId!: string;

  @IsEnum(['auto', 'manual'])
  strategy!: 'auto' | 'manual';

  @IsOptional()
  @IsObject()
  sectionsMap?: Record<string, 'left' | 'right' | 'merged'>;

  @IsOptional()
  @IsString()
  label?: string;
}

