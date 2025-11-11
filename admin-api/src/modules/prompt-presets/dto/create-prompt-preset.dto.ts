import { IsString, IsBoolean, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreatePromptPresetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;

  @IsString()
  @IsNotEmpty()
  userPromptTemplate!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  version?: string;
}

