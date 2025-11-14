import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatTreeRepository } from './chat-tree.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { PrismaService } from '../../prisma/prisma.service';
import DiffMatchPatch from 'diff-match-patch';
import { DocJson } from './types/doc';
import { MergeNodesDto } from './dto/merge-nodes.dto';
import { merge as diff3Merge } from 'diff3';

@Injectable()
export class ChatTreeService {
  constructor(
    private readonly repository: ChatTreeRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createSession(dto: CreateSessionDto) {
    const session = await this.repository.createSession({
      title: dto.title.trim(),
    });

    return {
      id: session.id,
      title: session.title,
      rootNodeId: session.rootNodeId,
      currentNodeId: session.currentNodeId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  async listSessions() {
    return this.repository.listSessions();
  }

  async createNode(sessionId: string, dto: CreateNodeDto) {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const promptText = dto.promptText.trim();
    if (!promptText) {
      throw new BadRequestException('promptText is required');
    }

    const label = dto.label?.trim();
    const model = dto.model?.trim();
    const preset = dto.preset?.trim();

    return this.prisma.$transaction(async (tx) => {
      if (!dto.parentId) {
        if (session.rootNodeId) {
          throw new BadRequestException('Root node already exists for this session');
        }

        const nodeData = {
          session: { connect: { id: sessionId } },
          path: '1',
          depth: 0,
          siblingIndex: 1,
          label: label ?? null,
          promptText,
          model: model ?? null,
          preset: preset ?? null,
          responseJson: null,
          responseMd: null,
          meta: null,
          // TODO(llm): populate responseJson/responseMd/meta via LLM call
        } as const;

        const node = await this.repository.createNode(nodeData, tx);

        await this.repository.updateSession(
          sessionId,
          {
            rootNodeId: node.id,
            currentNodeId: node.id,
          } as any,
          tx,
        );

        return this.buildNodeResponse(node);
      }

      const parent = await this.repository.findNodeById(dto.parentId, tx);
      if (!parent || parent.sessionId !== sessionId) {
        throw new BadRequestException('Parent node not found in this session');
      }

      const siblingIndex = (await this.repository.countChildren(sessionId, parent.id, tx)) + 1;
      const path = `${parent.path}.${siblingIndex}`;
      const depth = parent.depth + 1;

      const nodeData = {
        session: { connect: { id: sessionId } },
        parent: { connect: { id: parent.id } },
        path,
        depth,
        siblingIndex,
        label: label ?? null,
        promptText,
        model: model ?? null,
        preset: preset ?? null,
        responseJson: null,
        responseMd: null,
        meta: null,
        // TODO(llm): populate responseJson/responseMd/meta via LLM call
      } as const;

      const node = await this.repository.createNode(nodeData, tx);

      await this.repository.updateSession(
        sessionId,
        {
          currentNodeId: node.id,
        } as any,
        tx,
      );

      return this.buildNodeResponse(node);
    });
  }

  async checkoutNode(sessionId: string, nodeId: string) {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const node = await this.repository.findNodeById(nodeId);
    if (!node || node.sessionId !== sessionId) {
      throw new BadRequestException('Node not found in this session');
    }

    await this.repository.updateSession(sessionId, {
      currentNodeId: node.id,
    } as any);

    return { success: true, currentNodeId: node.id };
  }

  async getTree(sessionId: string) {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const nodes = await this.repository.findNodesBySession(sessionId);

    return {
      session: {
        id: session.id,
        title: session.title,
        rootNodeId: session.rootNodeId,
        currentNodeId: session.currentNodeId,
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        parentId: node.parentId,
        path: node.path,
        depth: node.depth,
        siblingIndex: node.siblingIndex,
        label: node.label,
        promptText: node.promptText,
        createdAt: node.createdAt,
      })),
    };
  }

  async getNodeDetail(sessionId: string, nodeId: string) {
    const node = await this.repository.findNodeDetail(nodeId);
    if (!node || node.sessionId !== sessionId) {
      throw new NotFoundException('Node not found');
    }
    return node;
  }

  async listMergeOperations(sessionId: string): Promise<any[]> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.repository.findMergeOperations(sessionId);
  }

  async diffNodes(sessionId: string, leftNodeId: string, rightNodeId: string) {
    if (leftNodeId === rightNodeId) {
      return { sections: [] };
    }

    const [left, right, session] = await Promise.all([
      this.repository.findNodeWithDocument(leftNodeId),
      this.repository.findNodeWithDocument(rightNodeId),
      this.repository.findSessionById(sessionId),
    ]);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!left || left.sessionId !== sessionId) {
      throw new BadRequestException('Left node not found in this session');
    }

    if (!right || right.sessionId !== sessionId) {
      throw new BadRequestException('Right node not found in this session');
    }

    const leftDoc = (left.responseJson as DocJson | null) ?? null;
    const rightDoc = (right.responseJson as DocJson | null) ?? null;

    if (!leftDoc || !rightDoc || !Array.isArray(leftDoc.sections) || !Array.isArray(rightDoc.sections)) {
      return { sections: [] };
    }

    const leftMap = new Map(leftDoc.sections.map((section) => [section.key, section]));
    const rightMap = new Map(rightDoc.sections.map((section) => [section.key, section]));

    const allKeys = new Set<string>([...leftMap.keys(), ...rightMap.keys()]);
    const dmp = new DiffMatchPatch();

    const sections = Array.from(allKeys).map((key) => {
      const leftSection = leftMap.get(key);
      const rightSection = rightMap.get(key);

      if (!leftSection && rightSection) {
        return { key, status: 'right-only' as const };
      }

      if (leftSection && !rightSection) {
        return { key, status: 'left-only' as const };
      }

      if (!leftSection || !rightSection) {
        return { key, status: 'equal' as const };
      }

      const leftMarkdown = leftSection.markdown ?? '';
      const rightMarkdown = rightSection.markdown ?? '';

      if (leftMarkdown === rightMarkdown) {
        return { key, status: 'equal' as const };
      }

      const patches = dmp.patch_make(leftMarkdown, rightMarkdown);
      return {
        key,
        status: 'changed' as const,
        patches,
      };
    });

    return { sections };
  }

  async mergeNodes(sessionId: string, dto: MergeNodesDto) {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const [left, right] = await Promise.all([
      this.repository.findNodeWithDocument(dto.leftNodeId),
      this.repository.findNodeWithDocument(dto.rightNodeId),
    ]);

    if (!left || left.sessionId !== sessionId) {
      throw new BadRequestException('Left node not found in this session');
    }

    if (!right || right.sessionId !== sessionId) {
      throw new BadRequestException('Right node not found in this session');
    }

    let baseNodeId = dto.baseNodeId;
    if (!baseNodeId) {
      baseNodeId = await this.findLCA(sessionId, dto.leftNodeId, dto.rightNodeId);
    }

    const base = await this.repository.findNodeWithDocument(baseNodeId);
    if (!base || base.sessionId !== sessionId) {
      throw new BadRequestException('Base node not found in this session');
    }

    const baseDoc = (base.responseJson as DocJson | null) ?? null;
    const leftDoc = (left.responseJson as DocJson | null) ?? null;
    const rightDoc = (right.responseJson as DocJson | null) ?? null;

    if (!baseDoc || !leftDoc || !rightDoc) {
      throw new BadRequestException('All nodes must have responseJson for merge');
    }

    const baseMap = new Map(baseDoc.sections.map((s) => [s.key, s]));
    const leftMap = new Map(leftDoc.sections.map((s) => [s.key, s]));
    const rightMap = new Map(rightDoc.sections.map((s) => [s.key, s]));

    const allKeys = new Set<string>([...baseMap.keys(), ...leftMap.keys(), ...rightMap.keys()]);
    const mergedSections: any[] = [];
    const conflicts: string[] = [];

    for (const key of allKeys) {
      const baseSection = baseMap.get(key);
      const leftSection = leftMap.get(key);
      const rightSection = rightMap.get(key);

      let chosen: 'left' | 'right' | 'merged' | null = null;
      let mergedSection: any = null;

      if (dto.strategy === 'auto') {
        if (leftSection && !rightSection) {
          chosen = 'left';
          mergedSection = { ...leftSection };
        } else if (rightSection && !leftSection) {
          chosen = 'right';
          mergedSection = { ...rightSection };
        } else if (leftSection && rightSection) {
          const leftMd = leftSection.markdown ?? '';
          const rightMd = rightSection.markdown ?? '';

          if (leftMd === rightMd) {
            chosen = 'left';
            mergedSection = { ...leftSection };
          } else {
            chosen = 'right';
            mergedSection = { ...rightSection };
            conflicts.push(key);
          }
        } else if (baseSection) {
          chosen = 'left';
          mergedSection = { ...baseSection };
        }
      } else {
        const mapChoice = dto.sectionsMap?.[key];
        if (!mapChoice) {
          throw new BadRequestException(`Section "${key}" not found in sectionsMap`);
        }

        chosen = mapChoice;

        if (mapChoice === 'left') {
          mergedSection = leftSection ? { ...leftSection } : baseSection ? { ...baseSection } : null;
        } else if (mapChoice === 'right') {
          mergedSection = rightSection ? { ...rightSection } : baseSection ? { ...baseSection } : null;
        } else if (mapChoice === 'merged') {
          const baseMd = baseSection?.markdown ?? '';
          const leftMd = leftSection?.markdown ?? '';
          const rightMd = rightSection?.markdown ?? '';

          const baseLines = baseMd.split('\n');
          const leftLines = leftMd.split('\n');
          const rightLines = rightMd.split('\n');
          const result = diff3Merge(baseLines, leftLines, rightLines);
          const mergedMd = result
            .map((chunk) => {
              if (Array.isArray(chunk) && chunk.length === 3) {
                return chunk[2];
              }
              if (Array.isArray(chunk)) {
                return chunk[0];
              }
              return String(chunk);
            })
            .join('\n');

          mergedSection = {
            ...(baseSection ?? leftSection ?? rightSection ?? {}),
            key,
            markdown: mergedMd,
          };

          if (leftMd !== rightMd && leftMd !== baseMd && rightMd !== baseMd) {
            conflicts.push(key);
          }
        }
      }

      if (mergedSection) {
        mergedSections.push(mergedSection);
      }
    }

    const mergedDoc: DocJson = {
      version: baseDoc.version,
      meta: { ...baseDoc.meta, mergedAt: new Date().toISOString() },
      sections: mergedSections,
    };

    const mergedMd = mergedSections.map((s) => `# ${s.title}\n\n${s.markdown ?? ''}`).join('\n\n');

    return this.prisma.$transaction(async (tx) => {
      const baseNode = await this.repository.findNodeById(baseNodeId, tx);
      if (!baseNode) {
        throw new BadRequestException('Base node not found');
      }

      const siblingIndex = (await this.repository.countChildren(sessionId, baseNodeId, tx)) + 1;
      const path = `${baseNode.path}.${siblingIndex}`;
      const depth = baseNode.depth + 1;

      const targetNode = await this.repository.createNode(
        {
          session: { connect: { id: sessionId } },
          parent: { connect: { id: baseNodeId } },
          path,
          depth,
          siblingIndex,
          label: dto.label ?? `merge(${dto.leftNodeId.slice(0, 8)},${dto.rightNodeId.slice(0, 8)})`,
          promptText: `Merged from ${dto.leftNodeId} and ${dto.rightNodeId}`,
          model: null,
          preset: null,
          responseJson: mergedDoc,
          responseMd: mergedMd,
          meta: {
            mergeStrategy: dto.strategy,
            baseNodeId,
            leftNodeId: dto.leftNodeId,
            rightNodeId: dto.rightNodeId,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
          },
        },
        tx,
      );

      await this.repository.createMergeOperation(
        {
          sessionId,
          targetNodeId: targetNode.id,
          baseNodeId,
          leftNodeId: dto.leftNodeId,
          rightNodeId: dto.rightNodeId,
          strategy: dto.strategy,
          sectionsMap: dto.sectionsMap ?? {},
          conflicts: conflicts.length > 0 ? conflicts : null,
        },
        tx,
      );

      await this.repository.updateSession(
        sessionId,
        {
          currentNodeId: targetNode.id,
        } as any,
        tx,
      );

      return {
        targetNodeId: targetNode.id,
        path: targetNode.path,
        conflicts: conflicts.length > 0 ? conflicts : [],
        sectionsMap: dto.sectionsMap ?? {},
      };
    });
  }

  private async findLCA(sessionId: string, leftId: string, rightId: string): Promise<string> {
    const [left, right] = await Promise.all([
      this.repository.findNodeById(leftId),
      this.repository.findNodeById(rightId),
    ]);

    if (!left || !right || left.sessionId !== sessionId || right.sessionId !== sessionId) {
      throw new BadRequestException('Nodes not found in session');
    }

    const leftPath = left.path.split('.');
    const rightPath = right.path.split('.');

    const minLength = Math.min(leftPath.length, rightPath.length);
    let commonPrefixLength = 0;

    for (let i = 0; i < minLength; i++) {
      if (leftPath[i] === rightPath[i]) {
        commonPrefixLength = i + 1;
      } else {
        break;
      }
    }

    if (commonPrefixLength === 0) {
      throw new BadRequestException('No common ancestor found');
    }

    const lcaPath = leftPath.slice(0, commonPrefixLength).join('.');
    const nodes = await this.repository.findNodesBySession(sessionId);
    const lcaNode = nodes.find((n) => n.path === lcaPath);

    if (!lcaNode) {
      throw new BadRequestException('LCA node not found');
    }

    return lcaNode.id;
  }

  private buildNodeResponse(node: { id: string; path: string; depth: number; siblingIndex: number; label: string | null; promptText: string; createdAt: Date }) {
    return {
      id: node.id,
      path: node.path,
      depth: node.depth,
      siblingIndex: node.siblingIndex,
      label: node.label,
      promptText: node.promptText,
      createdAt: node.createdAt,
    };
  }
}
