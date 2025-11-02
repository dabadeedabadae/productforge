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

  // список сессий
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

  // создать новую сессию
  async createSession(title = 'New chat') {
    return this.prisma.chatSession.create({
      data: { title },
    });
  }

  // получить сообщения одной сессии
  async getMessages(sessionId: number) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  // отправить сообщение → получить ответ от Groq → сохранить оба
  async sendMessage(sessionId: number, userMessage: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Chat session not found');

    // 1) сохраним сообщение пользователя
    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: userMessage,
      },
    });

    // 2) соберём контекст (последние N сообщений)
    const lastMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 15,
    });

    // 3) сделаем запрос в Groq
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Ты ассистент, помогай по шаблонам и ТЗ, отвечай кратко.' },
        ...lastMessages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
      temperature: 0.4,
    });

    const assistantText = completion.choices[0]?.message?.content ?? '…';

    // 4) сохраним ответ ассистента
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantText,
      },
    });

    // 5) обновим updatedAt у сессии
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return assistantMessage;
  }
}
