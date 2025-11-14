// src/modules/templates/templates.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JsonSchemaService } from './validation/json-schema.service';
import { sanitizeHtmlServer } from '../../security/sanitize';
import { GroqService } from '../ai/groq.service';

const MAX_HTML_SIZE = 50 * 1024; // 50 KB
const MAX_SCHEMA_SIZE = 100 * 1024; // 100 KB

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jsonSchemaService: JsonSchemaService,
    private readonly groqService: GroqService,
  ) {}

  async create(dto: CreateTemplateDto) {
    const {
      title,
      slug,
      description = '',
      html,
      isPublished = false,
      schemaJson: rawSchemaJson = null,
    } = dto;

    this.ensureHtmlSize(html);
    const sanitizedHtml = sanitizeHtmlServer(html);

    // Проверка уникальности slug
    const existing = await this.prisma.template.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Template with slug "${slug}" already exists`);
    }

    let schemaJson = this.normalizeSchema(rawSchemaJson);
    if (schemaJson) {
      this.ensureSchemaSize(schemaJson);
      this.ensureSchemaValid(schemaJson);
    }

    return this.prisma.template.create({
      data: {
        title,
        slug,
        description,
        html: sanitizedHtml,
        isPublished,
        schemaJson,
      },
    });
  }

  async list({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async get(id: number) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(id: number, dto: UpdateTemplateDto) {
    const template = await this.get(id);

    const updateData: Record<string, any> = { ...dto };

    if (updateData.html !== undefined) {
      this.ensureHtmlSize(updateData.html);
      updateData.html = sanitizeHtmlServer(updateData.html);
    }

    if (updateData.slug !== undefined && updateData.slug !== template.slug) {
      const existing = await this.prisma.template.findUnique({
        where: { slug: updateData.slug },
      });
      if (existing) {
        throw new ConflictException(`Template with slug "${updateData.slug}" already exists`);
      }
    }

    if (updateData.schemaJson !== undefined && updateData.schemaJson !== null) {
      updateData.schemaJson = this.normalizeSchema(updateData.schemaJson);
      this.ensureSchemaSize(updateData.schemaJson);
      this.ensureSchemaValid(updateData.schemaJson);
    }

    return this.prisma.template.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    return this.prisma.template.delete({
      where: { id },
    });
  }

  validateSchema(schema: Record<string, any>) {
    const normalizedSchema = this.normalizeSchema(schema);
    this.ensureSchemaSize(normalizedSchema);
    const result = this.jsonSchemaService.validateSchema(normalizedSchema);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Schema validation failed',
        errors: result.errors,
      });
    }

    return { valid: true };
  }

  async testTemplateWithAI(
    templateId: number,
    params: { topic: string; locale?: string },
  ) {
    const template = await this.get(templateId);
    if (!template.schemaJson) {
      throw new BadRequestException('Template has no schemaJson');
    }

    const schema = template.schemaJson as Record<string, any>;
    this.ensureSchemaValid(schema);

    const locale = params.locale?.trim() || 'ru';
    const topic = params.topic.trim();
    if (!topic) {
      throw new BadRequestException('Topic is required');
    }

    const startedAt = Date.now();
    const primary = await this.groqService.fillSchema({
      schemaJson: schema,
      topic,
      locale,
    });

    let totalAttempts = primary.attempts;
    let content = primary.content;

    const parsedPrimary = this.tryParseJson(content);
    let data = parsedPrimary.data;
    let validationErrors = parsedPrimary.error ? [parsedPrimary.error] : [];

    if (!parsedPrimary.success) {
      this.logger.warn(
        `AI primary response parse failed for template=${templateId}: ${parsedPrimary.error}`,
      );
    } else {
      const validation = this.jsonSchemaService.validateData(schema, data);
      if (!validation.valid) {
        validationErrors = this.formatAjvErrors(validation.errors);
      } else {
        validationErrors = [];
      }
    }

    if (validationErrors.length > 0) {
      const repair = await this.groqService.repairSchema({
        schemaJson: schema,
        topic,
        locale,
        rawOutput: content,
        errors: validationErrors,
      });
      totalAttempts += repair.attempts;
      content = repair.content;

      const parsedRepair = this.tryParseJson(content);
      if (!parsedRepair.success) {
        throw new BadRequestException({
          message: 'AI response is not valid JSON',
          errors: [parsedRepair.error],
        });
      }

      data = parsedRepair.data;
      const validation = this.jsonSchemaService.validateData(schema, data);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'AI response does not satisfy schema',
          errors: this.formatAjvErrors(validation.errors),
        });
      }
    }

    const totalLatency = Date.now() - startedAt;
    this.logger.log(
      `AI test succeeded template=${templateId} attempts=${totalAttempts} latency=${totalLatency}ms`,
    );

    return {
      templateId,
      topic,
      data,
      metadata: {
        model: this.groqService.getModel(),
        attempts: totalAttempts,
        latencyMs: totalLatency,
      },
    };
  }

  private ensureHtmlSize(html: string) {
    const size = Buffer.byteLength(html, 'utf8');
    if (size > MAX_HTML_SIZE) {
      throw new PayloadTooLargeException(
        `HTML exceeds maximum allowed size of ${MAX_HTML_SIZE / 1024}KB`,
      );
    }
  }

  private ensureSchemaSize(schema: Record<string, any>) {
    const size = Buffer.byteLength(JSON.stringify(schema), 'utf8');
    if (size > MAX_SCHEMA_SIZE) {
      throw new PayloadTooLargeException(
        `schemaJson exceeds maximum allowed size of ${MAX_SCHEMA_SIZE / 1024}KB`,
      );
    }
  }

  private ensureSchemaValid(schema: Record<string, any>) {
    const result = this.jsonSchemaService.validateSchema(schema);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Schema validation failed',
        errors: result.errors,
      });
    }
  }

  private tryParseJson(content: string): {
    success: boolean;
    data?: any;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(content);
      return { success: true, data: parsed };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Invalid JSON' };
    }
  }

  private formatAjvErrors(errors: any[] = []): string[] {
    return errors.map((error) => {
      const instancePath = typeof error?.instancePath === 'string' ? error.instancePath : '';
      const location = instancePath && instancePath.length > 0 ? instancePath : error?.schemaPath;
      return `${location ?? 'data'}: ${error?.message ?? 'is invalid'}`;
    });
  }

  private normalizeSchema(value: any): Record<string, any> | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
        throw new Error('schemaJson must be a JSON object');
      } catch (error: any) {
        throw new BadRequestException(`schemaJson parse error: ${error?.message ?? error}`);
      }
    }

    if (typeof value !== 'object') {
      throw new BadRequestException('schemaJson must be an object');
    }

    return value as Record<string, any>;
  }
}
