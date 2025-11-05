import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Groq from 'groq-sdk';

@Injectable()
export class DocGenService {
  private readonly groq: Groq;

  constructor(private readonly prisma: PrismaService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }


  async generatePackage(input: {
    concept: string;
    domain?: string;
    docs?: string[]; 
    locale?: string;
  }) {
    const { concept, domain = 'generic', locale = 'ru' } = input;

    
    const templates = await this.prisma.template.findMany();

  
    console.log(
      'Docgen templates:',
      templates.map((t: any) => ({
        id: t.id,
        title: t.title,
        kind: t.schemaJson?.kind,
      })),
    );

    const srsTemplate = templates.find(
      (t: any) => t.schemaJson && t.schemaJson.kind === 'srs',
    );

    if (!srsTemplate) {
      throw new NotFoundException('SRS template with schemaJson.kind = "srs" not found');
    }

    const filledSrs = await this.fillByGroq({
      schemaJson: srsTemplate.schemaJson,
      concept,
      domain,
      locale,
    });

    const docs = {
      srs: {
        templateId: srsTemplate.id,
        title: srsTemplate.title,
        data: filledSrs,
      },
    };

    const final = {
      concept,
      domain,
      generatedAt: new Date().toISOString(),
      docs,
    };

    const saved = await this.prisma.generatedDocPackage.create({
      data: {
        concept,
        domain: domain || null,
        docs, 
      },
    });

    return {
      id: saved.id,
      ...final,
    };
  }

  async listPackages() {
    return this.prisma.generatedDocPackage.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        concept: true,
        domain: true,
        createdAt: true,
      },
    });
  }

  async getPackage(id: number) {
    const pkg = await this.prisma.generatedDocPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new NotFoundException('Doc package not found');
    }

    return pkg;
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
Твоя задача — вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ, но со смысловыми значениями. Язык: ${locale}.
Если раздел требует список — делай 3–7 осмысленных пунктов.
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
