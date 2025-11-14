import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JsonSchemaService } from './validation/json-schema.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, JsonSchemaService],
  exports: [TemplatesService, JsonSchemaService],
})
export class TemplatesModule {}
