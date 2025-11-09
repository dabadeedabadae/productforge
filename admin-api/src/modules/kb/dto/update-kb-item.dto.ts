import { PartialType } from '@nestjs/mapped-types';
import { CreateKbItemDto } from './create-kb-item.dto';

export class UpdateKbItemDto extends PartialType(CreateKbItemDto) {}
