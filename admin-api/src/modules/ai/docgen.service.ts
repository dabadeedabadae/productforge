import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Groq from 'groq-sdk';

@Injectable()
export class DocGenService {
  private groq: Groq;

  constructor(private readonly prisma: PrismaService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generatePackage(input: {
    concept: string;
    domain?: string;
    docs?: string[]; // ['srs', 'api', 'db', ...]
    locale?: 'ru' | 'en';
  }) {
    const { concept, domain = 'generic', docs = ['srs', 'api', 'db'], locale = 'ru' } = input;

    // 1. забираем из БД все шаблоны, у которых в schemaJson есть kind и он входит в docs
    const templates = await this.prisma.template.findMany({
      where: {
        // мы не можем по JSON везде фильтрануть, поэтому забираем всё и фильтруем руками
      },
    });

    const filtered = templates.filter((t: any) => {
      const k = (t as any).schemaJson?.kind;
      return k && docs.includes(k);
    });

    if (!filtered.length) {
      throw new NotFoundException('No templates found for requested docs');
    }

    const result: Record<string, any> = {};

    for (const tpl of filtered) {
      const kind = (tpl as any).schemaJson.kind as string;

      // 2. для каждого шаблона вызываем Groq
      const filled = await this.fillByGroq({
        schemaJson: tpl.schemaJson,
        concept,
        domain,
        locale,
      });

      result[kind] = {
        templateId: tpl.id,
        title: tpl.title,
        data: filled,
      };
    }

    return {
      concept,
      domain,
      generatedAt: new Date().toISOString(),
      docs: result,
    };
  }

  private async fillByGroq(params: {
    schemaJson: any;
    concept: string;
    domain: string;
    locale: string;
  }) {
    const { schemaJson, concept, domain, locale } = params;

    const systemPrompt = `
Ты — инженер требований и архитектор. Тебе дают структуру документа (JSON) и описание проекта.
Ты обязан вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ, но со заполненными полями. Язык: ${locale}.
Если раздел требует список — сделай 3-7 пунктов. Если это API — опиши эндпоинты подробно.
`;

    const userPrompt = `
Описание системы:
${concept}

Домен / контекст: ${domain}

Структура документа:
${JSON.stringify(schemaJson, null, 2)}

Заполни структуру под этот проект.
Верни только JSON.
`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(content);
  }
}
