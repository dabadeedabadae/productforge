import { Body, Controller, Post } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import { GroqService } from './groq.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly groq: GroqService,
  ) {}

  @Post('fill-template')
  async fillTemplate(
    @Body()
    body: {
      templateId: number;
      topic: string;
      locale?: string;
    },
  ) {
    const tpl = await this.templates.get(body.templateId); // у тебя уже есть get()
    if (!tpl.schemaJson) {
      return {
        error: 'Template has no schemaJson',
      };
    }

    const filled = await this.groq.fillSchema({
      schemaJson: tpl.schemaJson,
      topic: body.topic,
      locale: body.locale ?? 'ru',
    });

    return {
      templateId: tpl.id,
      topic: body.topic,
      filled,
    };
  }
}
