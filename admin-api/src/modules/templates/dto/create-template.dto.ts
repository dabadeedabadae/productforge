// src/modules/templates/dto/create-template.dto.ts
import { IsBoolean, IsOptional, IsString, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTemplateDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  html!: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  isPublished?: boolean;

  // 👇 ВОТ ЭТОГО НЕ ХВАТАЛО
  @IsOptional()
  @Transform(({ value }) => {
    // если фронт прислал строку из textarea — парсим
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  schemaJson?: Record<string, any>;
}
