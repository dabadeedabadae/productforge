import { PartialType } from '@nestjs/mapped-types';
import { CreatePromptPresetDto } from './create-prompt-preset.dto';

export class UpdatePromptPresetDto extends PartialType(CreatePromptPresetDto) {}

