import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Groq from 'groq-sdk';
import { CreateKbItemDto } from './dto/create-kb-item.dto';
import { UpdateKbItemDto } from './dto/update-kb-item.dto';
import { SearchKbDto } from './dto/search-kb.dto';
import { AnalyzeConceptDto } from './dto/analyze-concept.dto';

@Injectable()
export class KBService {
  private readonly groq: Groq;

  constructor(private readonly prisma: PrismaService) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  // ---------- CRUD ----------
  async createItem(dto: CreateKbItemDto) {
    const tagEntities = await this.ensureTags(dto.tags ?? []);
    const catEntities = await this.ensureCategories(dto.categories ?? []);

    return this.prisma.kBItem.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary ?? '',
        content: dto.content ?? '',
        domain: dto.domain,
        solutionType: dto.solutionType,
        techStack: dto.techStack,
        tags: {
          createMany: {
            data: tagEntities.map(t => ({ tagId: t.id })),
            skipDuplicates: true,
          },
        },
        categories: {
          createMany: {
            data: catEntities.map(c => ({ categoryId: c.id })),
            skipDuplicates: true,
          },
        },
      },
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });
  }

  async updateItem(id: number, dto: UpdateKbItemDto) {
    const item = await this.prisma.kBItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('KB item not found');

    // если пришли новые теги/категории — перезапишем связи
    let tagsConnect: any[] = [];
    let catsConnect: any[] = [];

    if (dto.tags) {
      const tagEntities = await this.ensureTags(dto.tags);
      await this.prisma.kBItemTag.deleteMany({ where: { kbItemId: id } });
      tagsConnect = tagEntities.map(t => ({ tagId: t.id }));
    }
    if (dto.categories) {
      const catEntities = await this.ensureCategories(dto.categories);
      await this.prisma.kBItemCategory.deleteMany({ where: { kbItemId: id } });
      catsConnect = catEntities.map(c => ({ categoryId: c.id }));
    }

    return this.prisma.kBItem.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content: dto.content,
        domain: dto.domain,
        solutionType: dto.solutionType,
        techStack: dto.techStack,
        ...(tagsConnect.length ? { categories: { createMany: { data: catsConnect } } } : {}),
        ...(catsConnect.length ? { tags: { createMany: { data: tagsConnect } } } : {}),
      },
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });
  }

  async getItem(id: number) {
    const item = await this.prisma.kBItem.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });
    if (!item) throw new NotFoundException('KB item not found');
    return item;
  }

  async listItems(query: SearchKbDto) {
    const where: any = { };
    if (query.domain) where.domain = query.domain;

    // простая фильтрация/поиск
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { summary: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
        { solutionType: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.tag) {
      where.tags = { some: { tag: { name: { equals: query.tag, mode: 'insensitive' } } } };
    }
    if (query.category) {
      where.categories = { some: { category: { name: { equals: query.category, mode: 'insensitive' } } } };
    }

    return this.prisma.kBItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
      },
    });
  }

  // ---------- Теги/Категории ----------
  async ensureTags(names: string[]) {
    const trimmed = names.map(n => n.trim()).filter(Boolean);
    const existing = await this.prisma.tag.findMany({ where: { name: { in: trimmed } } });
    const toCreate = trimmed.filter(n => !existing.find(e => e.name.toLowerCase() === n.toLowerCase()));
    if (toCreate.length) {
      await this.prisma.tag.createMany({ data: toCreate.map(name => ({ name })) });
    }
    return this.prisma.tag.findMany({ where: { name: { in: trimmed } } });
  }

  async ensureCategories(names: string[]) {
    const trimmed = names.map(n => n.trim()).filter(Boolean);
    const existing = await this.prisma.category.findMany({ where: { name: { in: trimmed } } });
    const toCreate = trimmed.filter(n => !existing.find(e => e.name.toLowerCase() === n.toLowerCase()));
    if (toCreate.length) {
      await this.prisma.category.createMany({ data: toCreate.map(name => ({ name })) });
    }
    return this.prisma.category.findMany({ where: { name: { in: trimmed } } });
  }

  // ---------- Аналитика ИИ ----------
  /**
   * Анализ концепта: теги/категории/классификация/сложность/осуществимость + похожие из KB.
   * Алгоритм:
   * 1) Жадный префильтр по ILIKE (до 30 кандидатов).
   * 2) LLM-rerank — просим выбрать топ-5 и выставить similarity [0..1].
   * 3) LLM генерит: tags, categories (из справочников), solutionTypes, complexity (1..5), feasibility, stack.
   */
  async analyzeConcept(dto: AnalyzeConceptDto) {
    const locale = dto.locale ?? 'ru';

    // Каталоги для контроля класса/тегов (LLM выбирает только из них)
    const allTags = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    const allCats = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });

    // Кандидаты по быстрым признакам
    const candidates = await this.prisma.kBItem.findMany({
      where: {
        OR: [
          { title: { contains: dto.concept, mode: 'insensitive' } },
          { summary: { contains: dto.concept, mode: 'insensitive' } },
          { content: { contains: dto.concept, mode: 'insensitive' } },
        ],
      },
      take: 30,
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });

    // Собираем компактные карточки для LLM-rerank
    const compact = candidates.map(c => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      solutionType: c.solutionType,
      domain: c.domain,
      tags: c.tags.map(t => t.tag.name),
      categories: c.categories.map(cc => cc.category.name),
    }));

    const system = [
      'Ты архитектор и инженер требований.',
      'Отвечай СТРОГО валидным JSON.',
      'Если в каталоге нет нужного значения — предлагай ближайшее из каталога, не придумывай новые.',
      'Сложность оцени по 1..5 (1 — тривиально, 5 — R&D/много интеграций/высокая неопределенность).',
      'Feasibility: дай score [0..1], risks[] и mitigations[].',
      'Похожие проекты: выбери максимум 5 и дай similarity [0..1] + короткую причину.',
    ].join(' ');

    const user = {
      locale,
      concept: dto.concept,
      domain: dto.domain ?? null,
      catalogs: {
        tags: allTags.map(t => t.name),
        categories: allCats.map(c => c.name),
      },
      kbCandidates: compact,
      requiredJsonShape: {
        tags: ['string'],
        categories: ['string'],
        solutionTypes: ['string'],
        complexity: {
          score: '1..5',
          drivers: ['string'],
          effort_person_months: { min: 'number', max: 'number' }
        },
        feasibility: {
          score: '0..1',
          risks: [{ risk: 'string', impact: 'low|medium|high', mitigation: 'string' }]
        },
        similar: [{ id: 'number', similarity: '0..1', reason: 'string' }],
        stack_recommendation: {
          backend: ['string'],
          frontend: ['string'],
          database: ['string'],
          services: ['string']
        },
        summary: 'string'
      }
    };

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) }
      ],
    });

    let text = completion.choices?.[0]?.message?.content?.trim() ?? '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const s = text.indexOf('{'); const e = text.lastIndexOf('}');
      if (s >= 0 && e > s) parsed = JSON.parse(text.slice(s, e + 1));
      else throw new Error('AI did not return JSON');
    }

    // Сохраняем снапшот (история анализов)
    const snapshot = await this.prisma.analysisSnapshot.create({
      data: {
        concept: dto.concept,
        domain: dto.domain,
        packageId: dto.packageId,
        result: parsed,
      },
    });

    return { id: snapshot.id, ...parsed };
  }
}
