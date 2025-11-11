import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptPresetsService } from '../prompt-presets/prompt-presets.service';
import Groq from 'groq-sdk';
import { DocumentType, DetailLevel } from '@prisma/client';
import { srsToMarkdown, jsonToMarkdown } from './utils/json-to-markdown.util';

@Injectable()
export class DocGenService {
  private readonly groq: Groq;

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptPresetsService: PromptPresetsService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async generatePackage(input: {
    concept: string;
    domain?: string;
    docs?: string[];
    locale?: string;
    detailLevel?: DetailLevel;
    promptPresetIds?: Record<string, number>; // { srs: 1, api: 2 }
    useABTest?: boolean;
  }) {
    const {
      concept,
      domain = 'generic',
      locale = 'ru',
      detailLevel = DetailLevel.STANDARD,
      docs = ['srs'],
      promptPresetIds = {},
      useABTest = false,
    } = input;

    if (!concept.trim()) {
      throw new BadRequestException('Concept is required');
    }

    // Маппинг типов документов
    const docTypeMap: Record<string, DocumentType> = {
      srs: DocumentType.SRS,
      api: DocumentType.API,
      db: DocumentType.DB,
      userflows: DocumentType.USERFLOWS,
    };

    const generatedDocs: Record<string, any> = {};
    const sectionsToSave: any[] = [];

    // Генерируем каждый запрошенный документ
    for (const docKey of docs) {
      const documentType = docTypeMap[docKey];
      if (!documentType) {
        console.warn(`Unknown document type: ${docKey}`);
        continue;
      }

      // Находим шаблон для этого типа документа
      const template = await this.prisma.template.findFirst({
        where: {
          documentType,
          isPublished: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!template || !template.schemaJson) {
        console.warn(`Template not found for document type: ${documentType}`);
        continue;
      }

      // Получаем промпт-пресет
      let promptPreset = null;
      if (promptPresetIds[docKey]) {
        try {
          promptPreset = await this.promptPresetsService.get(promptPresetIds[docKey]);
        } catch (e) {
          console.warn(`Prompt preset ${promptPresetIds[docKey]} not found, using default`);
        }
      }

      if (!promptPreset) {
        promptPreset = await this.promptPresetsService.getDefault(documentType);
      }

      // Если A/B тест - получаем две версии
      if (useABTest && promptPreset) {
        const abPresets = await this.promptPresetsService.getForABTest(documentType, ['v1', 'v2']);
        if (abPresets.length >= 2) {
          // Генерируем обе версии и сохраняем как варианты
          const [v1Result, v2Result] = await Promise.all([
            this.generateDocument({
              template,
              concept,
              domain,
              locale,
              detailLevel,
              promptPreset: abPresets[0],
              documentType,
            }),
            this.generateDocument({
              template,
              concept,
              domain,
              locale,
              detailLevel,
              promptPreset: abPresets[1],
              documentType,
            }),
          ]);

          generatedDocs[docKey] = {
            templateId: template.id,
            title: template.title,
            data: v1Result.data,
            dataV2: v2Result.data, // вторая версия для сравнения
            markdown: v1Result.markdown,
            markdownV2: v2Result.markdown,
            promptPresetId: abPresets[0].id,
            promptPresetIdV2: abPresets[1].id,
          };
        } else {
          // Fallback к обычной генерации
          const result = await this.generateDocument({
            template,
            concept,
            domain,
            locale,
            detailLevel,
            promptPreset,
            documentType,
          });
          generatedDocs[docKey] = {
            templateId: template.id,
            title: template.title,
            data: result.data,
            markdown: result.markdown,
            promptPresetId: promptPreset?.id,
          };
        }
      } else {
        // Обычная генерация
        const result = await this.generateDocument({
          template,
          concept,
          domain,
          locale,
          detailLevel,
          promptPreset,
          documentType,
        });

        generatedDocs[docKey] = {
          templateId: template.id,
          title: template.title,
          data: result.data,
          markdown: result.markdown,
          promptPresetId: promptPreset?.id,
        };

        // Сохраняем секции для возможности регенерации
        if (template.schemaJson && typeof template.schemaJson === 'object' && 'sections' in template.schemaJson) {
          const sections = (template.schemaJson as any).sections || [];
          for (const section of sections) {
            if (section.id && result.data[section.id]) {
              const sectionContent = result.data[section.id];
              const sectionMarkdown = this.extractSectionMarkdown(sectionContent, documentType);

              sectionsToSave.push({
                packageId: 0, // будет установлен после создания пакета
                documentType,
                sectionId: section.id,
                sectionTitle: section.title || section.id,
                content: sectionContent,
                markdown: sectionMarkdown,
                promptPresetId: promptPreset?.id,
              });
            }
          }
        }
      }
    }

    // Сохраняем пакет
    const savedPackage = await this.prisma.generatedDocPackage.create({
      data: {
        concept,
        domain: domain || null,
        detailLevel,
        promptPresetId: promptPresetIds['srs'] || null,
        docs: generatedDocs,
      },
    });

    // Сохраняем секции
    if (sectionsToSave.length > 0) {
      await this.prisma.generatedDocSection.createMany({
        data: sectionsToSave.map((s) => ({
          ...s,
          packageId: savedPackage.id,
        })),
      });
    }

    return {
      id: savedPackage.id,
      concept,
      domain,
      detailLevel,
      generatedAt: new Date().toISOString(),
      docs: generatedDocs,
    };
  }

  async regenerateSection(
    packageId: number,
    documentType: DocumentType,
    sectionId: string,
    options?: {
      promptPresetId?: number;
      locale?: string;
    },
  ) {
    const pkg = await this.prisma.generatedDocPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // Находим шаблон
    const template = await this.prisma.template.findFirst({
      where: {
        documentType,
        isPublished: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!template || !template.schemaJson) {
      throw new NotFoundException('Template not found');
    }

    // Получаем секцию из schemaJson
    const schemaJson = template.schemaJson as any;
    const section = schemaJson.sections?.find((s: any) => s.id === sectionId);

    if (!section) {
      throw new NotFoundException('Section not found in template');
    }

    // Получаем промпт-пресет
    let promptPreset = null;
    if (options?.promptPresetId) {
      try {
        promptPreset = await this.promptPresetsService.get(options.promptPresetId);
      } catch (e) {
        // используем дефолтный
      }
    }

    if (!promptPreset) {
      promptPreset = await this.promptPresetsService.getDefault(documentType);
    }

    // Генерируем только эту секцию
    const sectionSchema = {
      [sectionId]: schemaJson[sectionId] || { type: section.type },
    };

    const filledSection = await this.fillByGroq({
      schemaJson: sectionSchema,
      concept: pkg.concept,
      domain: pkg.domain || 'generic',
      locale: options?.locale || 'ru',
      detailLevel: pkg.detailLevel,
      promptPreset,
      documentType,
      sectionId,
    });

    const sectionContent = filledSection[sectionId];
    const sectionMarkdown = this.extractSectionMarkdown(sectionContent, documentType);

    // Обновляем или создаем секцию
    const existingSection = await this.prisma.generatedDocSection.findFirst({
      where: {
        packageId,
        documentType,
        sectionId,
      },
    });

    if (existingSection) {
      await this.prisma.generatedDocSection.update({
        where: { id: existingSection.id },
        data: {
          content: sectionContent,
          markdown: sectionMarkdown,
          promptPresetId: promptPreset?.id,
          regeneratedAt: new Date(),
        },
      });
    } else {
      await this.prisma.generatedDocSection.create({
        data: {
          packageId,
          documentType,
          sectionId,
          sectionTitle: section.title || sectionId,
          content: sectionContent,
          markdown: sectionMarkdown,
          promptPresetId: promptPreset?.id,
        },
      });
    }

    // Обновляем основной документ в пакете
    const docs = pkg.docs as any;
    const docKey = this.getDocKeyFromType(documentType);
    if (docs[docKey] && docs[docKey].data) {
      docs[docKey].data[sectionId] = sectionContent;
      docs[docKey].markdown = this.regenerateMarkdown(docs[docKey].data, documentType);

      await this.prisma.generatedDocPackage.update({
        where: { id: packageId },
        data: { docs },
      });
    }

    return {
      sectionId,
      content: sectionContent,
      markdown: sectionMarkdown,
    };
  }

  async listPackages() {
    return this.prisma.generatedDocPackage.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        concept: true,
        domain: true,
        detailLevel: true,
        createdAt: true,
      },
    });
  }

  async getPackage(id: number) {
    const pkg = await this.prisma.generatedDocPackage.findUnique({
      where: { id },
      include: {
        sections: true,
      },
    });

    if (!pkg) {
      throw new NotFoundException('Doc package not found');
    }

    return pkg;
  }

  async getPackageSections(packageId: number, documentType?: DocumentType) {
    const where: any = { packageId };
    if (documentType) {
      where.documentType = documentType;
    }

    return this.prisma.generatedDocSection.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  private async generateDocument(params: {
    template: any;
    concept: string;
    domain: string;
    locale: string;
    detailLevel: DetailLevel;
    promptPreset: any;
    documentType: DocumentType;
  }) {
    const { template, concept, domain, locale, detailLevel, promptPreset, documentType } = params;

    const filledData = await this.fillByGroq({
      schemaJson: template.schemaJson,
      concept,
      domain,
      locale,
      detailLevel,
      promptPreset,
      documentType,
    });

    const markdown = this.regenerateMarkdown(filledData, documentType);

    return {
      data: filledData,
      markdown,
    };
  }

  private async fillByGroq(params: {
    schemaJson: any;
    concept: string;
    domain: string;
    locale: string;
    detailLevel: DetailLevel;
    promptPreset: any;
    documentType: DocumentType;
    sectionId?: string;
  }) {
    const { schemaJson, concept, domain, locale, detailLevel, promptPreset, documentType, sectionId } = params;

    // Используем промпт-пресет или дефолтные промпты
    let systemPrompt: string;
    let userPrompt: string;

    if (promptPreset) {
      // Интерполируем оба промпта
      const promptVars = {
        concept,
        domain,
        schemaJson: JSON.stringify(schemaJson, null, 2),
        detailLevel: detailLevel,
        sectionId: sectionId || '',
      };
      systemPrompt = this.interpolatePrompt(promptPreset.systemPrompt, promptVars);
      userPrompt = this.interpolatePrompt(promptPreset.userPromptTemplate, promptVars);
    } else {
      // Дефолтные промпты с учетом уровня детализации
      systemPrompt = this.getDefaultSystemPrompt(documentType, locale, detailLevel);
      userPrompt = this.getDefaultUserPrompt(concept, domain, schemaJson, locale, detailLevel, sectionId);
    }

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

  private interpolatePrompt(template: string, vars: Record<string, string | number | DetailLevel>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      const stringValue = typeof value === 'string' ? value : String(value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), stringValue);
    }
    return result;
  }

  private getDefaultSystemPrompt(documentType: DocumentType, locale: string, detailLevel: DetailLevel): string {
    const detailInstructions: Record<DetailLevel, string> = {
      BRIEF: 'Будь кратким. Минимум деталей, только ключевые моменты.',
      STANDARD: 'Предоставь стандартный уровень детализации. Баланс между краткостью и полнотой.',
      DETAILED: 'Будь максимально подробным. Включай все детали, примеры, граничные случаи.',
    };

    const basePrompts: Record<DocumentType, string> = {
      SRS: `Ты — инженер требований. Тебе дают структуру SRS документа и описание проекта.
Твоя задача — вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ, но со смысловыми значениями. Язык: ${locale}.`,
      API: `Ты — архитектор API. Тебе дают структуру API спецификации и описание проекта.
Твоя задача — вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ с детальным описанием endpoints, моделей данных, аутентификации. Язык: ${locale}.`,
      DB: `Ты — проектировщик баз данных. Тебе дают структуру схемы БД и описание проекта.
Твоя задача — вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ с таблицами, связями, индексами. Язык: ${locale}.`,
      USERFLOWS: `Ты — UX-аналитик. Тебе дают структуру пользовательских сценариев и описание проекта.
Твоя задача — вернуть ТОЛЬКО JSON ТАКОЙ ЖЕ СТРУКТУРЫ с детальными user flows, экранами, действиями. Язык: ${locale}.`,
    };

    return `${basePrompts[documentType]}\n\n${detailInstructions[detailLevel]}\nЕсли раздел требует список — делай ${
      detailLevel === DetailLevel.BRIEF ? '2-4' : detailLevel === DetailLevel.STANDARD ? '3-7' : '5-10'
    } осмысленных пунктов.`;
  }

  private getDefaultUserPrompt(
    concept: string,
    domain: string,
    schemaJson: any,
    locale: string,
    detailLevel: DetailLevel,
    sectionId?: string,
  ): string {
    const sectionHint = sectionId ? `\n\nВнимание: генерируй только секцию "${sectionId}".` : '';

    return `Описание системы:
${concept}

Домен / контекст: ${domain}

Уровень детализации: ${detailLevel}

Структура документа:
${JSON.stringify(schemaJson, null, 2)}${sectionHint}

Заполни структуру под этот проект.
Верни только JSON.`;
  }

  private regenerateMarkdown(data: any, documentType: DocumentType): string {
    if (documentType === DocumentType.SRS) {
      return srsToMarkdown(data);
    }
    return jsonToMarkdown(data);
  }

  private extractSectionMarkdown(content: any, documentType: DocumentType): string {
    if (Array.isArray(content)) {
      return content.map((item, idx) => {
        if (typeof item === 'object') {
          return `${idx + 1}. **${item.title || item.name || 'Item'}**\n   ${item.description || ''}`;
        }
        return `${idx + 1}. ${item}`;
      }).join('\n\n');
    }

    if (typeof content === 'string') {
      return content;
    }

    return jsonToMarkdown(content);
  }

  private getDocKeyFromType(documentType: DocumentType): string {
    const map: Record<DocumentType, string> = {
      SRS: 'srs',
      API: 'api',
      DB: 'db',
      USERFLOWS: 'userflows',
    };
    return map[documentType];
  }
}
