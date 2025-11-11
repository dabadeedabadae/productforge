import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromptPresetDto } from './dto/create-prompt-preset.dto';
import { UpdatePromptPresetDto } from './dto/update-prompt-preset.dto';
import { DocumentType } from '@prisma/client';

@Injectable()
export class PromptPresetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromptPresetDto) {
    // Если устанавливается как дефолтный, снимаем флаг с других пресетов этого типа
    if (dto.isDefault) {
      await this.prisma.promptPreset.updateMany({
        where: {
          documentType: dto.documentType,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.promptPreset.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        documentType: dto.documentType,
        systemPrompt: dto.systemPrompt,
        userPromptTemplate: dto.userPromptTemplate,
        isDefault: dto.isDefault || false,
        version: dto.version || 'v1',
      },
    });
  }

  async list(documentType?: DocumentType) {
    const where = documentType ? { documentType } : {};
    return this.prisma.promptPreset.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async get(id: number) {
    const preset = await this.prisma.promptPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      throw new NotFoundException('Prompt preset not found');
    }

    return preset;
  }

  async getDefault(documentType: DocumentType) {
    const preset = await this.prisma.promptPreset.findFirst({
      where: {
        documentType,
        isDefault: true,
      },
    });

    if (!preset) {
      // Возвращаем первый доступный пресет этого типа
      return this.prisma.promptPreset.findFirst({
        where: { documentType },
        orderBy: { createdAt: 'desc' },
      });
    }

    return preset;
  }

  async update(id: number, dto: UpdatePromptPresetDto) {
    const preset = await this.get(id);

    // Если устанавливается как дефолтный, снимаем флаг с других пресетов этого типа
    if (dto.isDefault === true) {
      await this.prisma.promptPreset.updateMany({
        where: {
          documentType: preset.documentType,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.promptPreset.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.get(id);
    return this.prisma.promptPreset.delete({
      where: { id },
    });
  }

  async getForABTest(documentType: DocumentType, versions: string[] = ['v1', 'v2']) {
    return this.prisma.promptPreset.findMany({
      where: {
        documentType,
        version: { in: versions },
      },
      orderBy: { version: 'asc' },
    });
  }
}

