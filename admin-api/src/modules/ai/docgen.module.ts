// src/modules/ai/docgen.module.ts
import { Module } from '@nestjs/common';
import { DocGenController } from './docgen.controller';
import { DocGenService } from './docgen.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptPresetsModule } from '../prompt-presets/prompt-presets.module';

@Module({
  imports: [PromptPresetsModule],
  controllers: [DocGenController],
  providers: [DocGenService, PrismaService],
})
export class DocGenModule {}
