import { IsOptional, IsString } from 'class-validator';

export class TestTemplateAiDto {
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
