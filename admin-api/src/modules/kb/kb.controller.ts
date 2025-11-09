import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { KBService } from './kb.service';
import { CreateKbItemDto } from './dto/create-kb-item.dto';
import { UpdateKbItemDto } from './dto/update-kb-item.dto';
import { SearchKbDto } from './dto/search-kb.dto';
import { AnalyzeConceptDto } from './dto/analyze-concept.dto';
import { Public } from '../../common/decorators/public.decorator'; // путь от controller до decorators

@Controller()
export class KBController {
  constructor(private readonly service: KBService) {}

  // CRUD KB
  @Post('kb/items')
  create(@Body() dto: CreateKbItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('kb/items/:id')
  update(@Param('id') id: string, @Body() dto: UpdateKbItemDto) {
    return this.service.updateItem(Number(id), dto);
  }

  @Get('kb/items/:id')
  one(@Param('id') id: string) {
    return this.service.getItem(Number(id));
  }

  @Get('kb/items')
  list(@Query() q: SearchKbDto) {
    return this.service.listItems(q);
  }

  // AI Analyze
  @Post('ai/kb/analyze')
  @Public()
  analyze(@Body() dto: AnalyzeConceptDto) {
    return this.service.analyzeConcept(dto);
  }
  
  
}
