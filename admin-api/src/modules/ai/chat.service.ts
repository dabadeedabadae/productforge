import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Groq from 'groq-sdk';

@Injectable()
export class ChatService {
  private groq: Groq;

  constructor(private readonly prisma: PrismaService) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async listSessions() {
    return this.prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });
  }

  async createSession(title = 'New chat') {
    return this.prisma.chatSession.create({
      data: { title },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getMessages(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return {
      ...session,
      messages: [],
    };
  }

  async sendMessage(sessionId: string, userMessage: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Ты ассистент, помогай по шаблонам и ТЗ, отвечай кратко.' },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.4,
    });

    const assistantText = completion.choices[0]?.message?.content ?? '…';

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return {
      sessionId,
      user: userMessage,
      assistant: assistantText,
    };
  }
}
