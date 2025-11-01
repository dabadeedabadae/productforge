// src/modules/templates/templates.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    const {
      title,
      slug,
      description = '',
      html,
      isPublished = false,
      schemaJson = null,
    } = dto;

    return this.prisma.template.create({
      data: {
        title,
        slug,
        description,
        html,
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
    // можно прямо dto передать, если ValidationPipe с whitelist включён
    return this.prisma.template.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.template.delete({
      where: { id },
    });
  }
}
