import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AnalyzeConceptDto {
  @IsString() concept!: string;
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsString() locale?: string; // 'ru' по умолчанию
  @IsOptional() @IsNumber() packageId?: number; // если анализим уже сгенерированный пакет
}
