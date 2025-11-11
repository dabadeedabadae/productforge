import { Body, Controller, Get, Param, Post, Patch, Query } from '@nestjs/common';
import { DocGenService } from './docgen.service';
import { Public } from '../../common/decorators/public.decorator';
import { DocumentType, DetailLevel } from '@prisma/client';

@Public()
@Controller('ai/docgen')
export class DocGenController {
  constructor(private readonly docgen: DocGenService) {}

  @Post('generate')
  async generate(@Body() body: any) {
    return this.docgen.generatePackage({
      concept: body.concept,
      domain: body.domain,
      docs: body.docs,
      locale: body.locale ?? 'ru',
      detailLevel: body.detailLevel 
        ? (body.detailLevel.toUpperCase() in DetailLevel 
            ? DetailLevel[body.detailLevel.toUpperCase() as keyof typeof DetailLevel]
            : DetailLevel.STANDARD)
        : DetailLevel.STANDARD,
      promptPresetIds: body.promptPresetIds || {},
      useABTest: body.useABTest || false,
    });
  }

  @Patch('packages/:id/sections/:documentType/:sectionId/regenerate')
  async regenerateSection(
    @Param('id') id: string,
    @Param('documentType') documentType: DocumentType,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.docgen.regenerateSection(Number(id), documentType, sectionId, {
      promptPresetId: body.promptPresetId,
      locale: body.locale,
    });
  }

  @Get('packages')
  async listPackages() {
    return this.docgen.listPackages();
  }

  @Get('packages/:id')
  async getPackage(@Param('id') id: string) {
    return this.docgen.getPackage(Number(id));
  }

  @Get('packages/:id/sections')
  async getPackageSections(
    @Param('id') id: string,
    @Query('documentType') documentType?: DocumentType,
  ) {
    return this.docgen.getPackageSections(Number(id), documentType);
  }
}
