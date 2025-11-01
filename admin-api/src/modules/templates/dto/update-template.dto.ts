// src/modules/templates/dto/update-template.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
