import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DocGenService } from './docgen.service';
import { Public } from '../../common/decorators/public.decorator';

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
}
