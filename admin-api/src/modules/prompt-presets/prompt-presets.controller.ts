import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { PromptPresetsService } from './prompt-presets.service';
import { CreatePromptPresetDto } from './dto/create-prompt-preset.dto';
import { UpdatePromptPresetDto } from './dto/update-prompt-preset.dto';
import { DocumentType } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('prompt-presets')
export class PromptPresetsController {
  constructor(private readonly service: PromptPresetsService) {}

  @Post()
  create(@Body() dto: CreatePromptPresetDto) {
    return this.service.create(dto);
  }

  @Get()
  list(@Query('documentType') documentType?: DocumentType) {
    return this.service.list(documentType);
  }

  @Get('default/:documentType')
  getDefault(@Param('documentType') documentType: DocumentType) {
    return this.service.getDefault(documentType);
  }

  @Get('ab-test/:documentType')
  getForABTest(
    @Param('documentType') documentType: DocumentType,
    @Query('versions') versions?: string,
  ) {
    const versionsArray = versions ? versions.split(',') : ['v1', 'v2'];
    return this.service.getForABTest(documentType, versionsArray);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromptPresetDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}

