import { IsArray, IsOptional, IsString, ArrayUnique, IsObject } from 'class-validator';

export class CreateKbItemDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsString() solutionType?: string;
  @IsOptional() @IsObject() techStack?: Record<string, any>;

  @IsOptional() @IsArray() @ArrayUnique() tags?: string[];       // имена тегов
  @IsOptional() @IsArray() @ArrayUnique() categories?: string[]; // имена категорий
}
