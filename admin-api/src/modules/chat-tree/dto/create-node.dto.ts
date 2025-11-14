import { IsOptional, IsString } from 'class-validator';

export class CreateNodeDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  promptText!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  preset?: string;
}
