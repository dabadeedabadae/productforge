import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ValidateTemplateSchemaDto } from './dto/validate-template-schema.dto';
import { TestTemplateAiDto } from './dto/test-template-ai.dto';
import { Throttle } from '@nestjs/throttler';

const THROTTLE_LIMIT = Number(process.env.THROTTLE_LIMIT ?? 10);
const THROTTLE_TTL = Number(process.env.THROTTLE_TTL ?? 60);

@Public()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list({ page: Number(page) || 1, limit: Number(limit) || 20 });
  }

  @Post('validate')
  validateSchema(@Body() dto: ValidateTemplateSchemaDto) {
    return this.service.validateSchema(dto.schema);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(Number(id), dto);
  }

  @Post(':id/test-ai')
  @Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })
  testWithAI(@Param('id') id: string, @Body() dto: TestTemplateAiDto) {
    return this.service.testTemplateWithAI(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
