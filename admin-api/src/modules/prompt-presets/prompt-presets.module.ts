import { Module } from '@nestjs/common';
import { PromptPresetsController } from './prompt-presets.controller';
import { PromptPresetsService } from './prompt-presets.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PromptPresetsController],
  providers: [PromptPresetsService, PrismaService],
  exports: [PromptPresetsService],
})
export class PromptPresetsModule {}

