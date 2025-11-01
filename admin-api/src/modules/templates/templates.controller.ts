import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public() // 👈 вот это — главное
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

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
