import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ChatTreeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(client?: PrismaClientLike): any {
    return (client ?? this.prisma) as any;
  }

  createSession(data: any, client?: PrismaClientLike) {
    return this.client(client).chatSession.create({ data });
  }

  listSessions(client?: PrismaClientLike) {
    return this.client(client).chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findSessionById(id: string, client?: PrismaClientLike) {
    return this.client(client).chatSession.findUnique({ where: { id } });
  }

  updateSession(id: string, data: any, client?: PrismaClientLike) {
    return this.client(client).chatSession.update({ where: { id }, data });
  }

  createNode(data: any, client?: PrismaClientLike) {
    return this.client(client).chatNode.create({ data });
  }

  findNodeById(id: string, client?: PrismaClientLike) {
    return this.client(client).chatNode.findUnique({ where: { id } });
  }

  countChildren(sessionId: string, parentId: string | null, client?: PrismaClientLike) {
    return this.client(client).chatNode.count({
      where: {
        sessionId,
        parentId,
      },
    });
  }

  findNodesBySession(sessionId: string, client?: PrismaClientLike) {
    return this.client(client).chatNode.findMany({
      where: { sessionId },
      orderBy: [{ path: 'asc' }],
    });
  }

  findNodeWithDocument(id: string, client?: PrismaClientLike) {
    return this.client(client).chatNode.findUnique({
      where: { id },
      select: {
        id: true,
        sessionId: true,
        responseJson: true,
      },
    });
  }

  findNodeDetail(id: string, client?: PrismaClientLike) {
    return this.client(client).chatNode.findUnique({
      where: { id },
      select: {
        id: true,
        sessionId: true,
        parentId: true,
        path: true,
        depth: true,
        siblingIndex: true,
        label: true,
        promptText: true,
        model: true,
        preset: true,
        responseJson: true,
        responseMd: true,
        meta: true,
        createdAt: true,
      },
    });
  }

  createMergeOperation(data: any, client?: PrismaClientLike) {
    return this.client(client).mergeOperation.create({ data });
  }

  findMergeOperations(sessionId: string, limit = 50, client?: PrismaClientLike) {
    return this.client(client).mergeOperation.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
