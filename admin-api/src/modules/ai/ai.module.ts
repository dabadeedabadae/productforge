import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GroqService } from './groq.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TemplatesModule],
  controllers: [AiController],
  providers: [GroqService],
})
export class AiModule {}
