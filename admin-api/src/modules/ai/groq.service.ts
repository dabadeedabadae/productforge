import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class GroqService {
  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async fillSchema(params: {
    schemaJson: any;
    topic: string;
    locale?: string;
  }) {
    const { schemaJson, topic, locale = 'ru' } = params;

    // Мы просим Groq вернуть ЧИСТЫЙ JSON — без текста
    const systemPrompt = `
Ты помощник, который заполняет JSON-схемы.
Тебе дают шаблон (schemaJson) и тему (topic).
Надо ВЕРНУТЬ только JSON того же формата, что и schemaJson, но со значениями.
Если есть массивы — создай 2-4 осмысленных элемента.
Пиши на языке: ${locale}.
`;

    const userPrompt = `
schemaJson:
${JSON.stringify(schemaJson, null, 2)}

topic: "${topic}"

Заполни эту структуру.
Верни ТОЛЬКО JSON. Без комментариев. Без Markdown.
`;

    // модель можешь сменить на более дешёвую, но эта стабильная на сегодня
    const completion = await this.client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // см. список моделей у Groq :contentReference[oaicite:1]{index=1}
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }, // чтобы он точно дал JSON :contentReference[oaicite:2]{index=2}
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    // content — это строка с JSON
    return JSON.parse(content);
  }
}
