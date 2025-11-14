import { IsObject } from 'class-validator';

export class ValidateTemplateSchemaDto {
  @IsObject()
  schema!: Record<string, any>;
}
