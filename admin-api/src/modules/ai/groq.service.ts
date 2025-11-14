import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqCallResult {
  content: string;
  attempts: number;
  latencyMs: number;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly client: Groq;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts = 3;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not set. AI features will not work properly.');
    }
    this.client = new Groq({ apiKey });
    this.model = process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile';
    this.timeoutMs = Number(process.env.GROQ_TIMEOUT_MS ?? 60000);
  }

  getModel() {
    return this.model;
  }

  async fillSchema(params: { schemaJson: any; topic: string; locale: string }): Promise<GroqCallResult> {
    const { schemaJson, topic, locale } = params;
    const systemPrompt = `Ты помощник, который заполняет JSON-схемы. Возвращай только валидный JSON строго по схеме без комментариев.`;
    const userPrompt = `Schema JSON (draft-07):
${JSON.stringify(schemaJson, null, 2)}

Topic: "${topic}"
Language: ${locale}

Заполни структуру валидными значениями. Верни только JSON.`;

    return this.executeWithRetries(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      'fill-schema',
    );
  }

  async repairSchema(params: {
    schemaJson: any;
    topic: string;
    locale: string;
    rawOutput: string;
    errors: string[];
  }): Promise<GroqCallResult> {
    const { schemaJson, topic, locale, rawOutput, errors } = params;
    const issues = errors.join('\n');
    const systemPrompt = `Ты помогаешь исправить JSON под заданную схему. Верни строго валидный JSON без текста.`;

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Schema JSON (draft-07):
${JSON.stringify(schemaJson, null, 2)}

Topic: "${topic}" (language: ${locale}).

Предыдущее невалидное значение:
${rawOutput}

Ошибки валидации:
${issues}

Верни исправленный JSON, который удовлетворяет схеме.`,
      },
    ];

    return this.executeWithRetries(messages, 'repair-schema');
  }

  private async executeWithRetries(
    messages: GroqMessage[],
    label: string,
  ): Promise<GroqCallResult> {
    const startedAt = Date.now();
    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      try {
        const completion = await this.withTimeout(
          this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        );

        const latencyMs = Date.now() - startedAt;
        const content = completion.choices?.[0]?.message?.content ?? '{}';
        this.logger.debug(`Groq ${label} success attempt=${attempt} latency=${latencyMs}ms`);
        return { content, attempts: attempt, latencyMs };
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Groq ${label} failed attempt=${attempt}: ${error instanceof Error ? error.message : error}`,
        );
        if (attempt >= this.maxAttempts) {
          throw error;
        }
        await this.delay(300 * attempt);
      }
    }

    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Groq request timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timeoutHandle!);
    }
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
