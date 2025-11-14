"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import DOMPurify from "dompurify";
import { testTemplateWithAI } from "@/lib/templates";

export type TemplateForm = {
  title: string;
  slug: string;
  description?: string;
  html: string;
  schemaJson?: string;
};

type Props = {
  initial?: TemplateForm;
  onSubmit: (data: TemplateForm) => Promise<void>;
  submitting?: boolean;
  templateId?: number; // для тестирования с AI
};

export default function TemplateEditor({ initial, onSubmit, submitting, templateId }: Props) {
  const [form, setForm] = useState<TemplateForm>(
    initial ?? {
      title: "",
      slug: "",
      description: "",
      html: "<h1>New Template</h1>",
      schemaJson: `{
  "version": 1,
  "name": "default-template",
  "category": "",
  "variables": [
    { "name": "title", "type": "string", "label": "Заголовок", "required": true }
  ]
}`,
    }
  );

  const [testingAI, setTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testMetadata, setTestMetadata] = useState<any>(null);
  const [testTopic, setTestTopic] = useState("Тестовый продукт");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // авто-генерация slug только если это новый шаблон
  useEffect(() => {
    if (!initial) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  // Автосохранение черновиков каждые 30 секунд
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(() => {
      const currentState = JSON.stringify(form);
      if (currentState !== lastSavedRef.current && form.title.trim()) {
        try {
          localStorage.setItem(`template-draft-${form.slug || 'new'}`, currentState);
          lastSavedRef.current = currentState;
          console.log("Draft auto-saved");
        } catch (err) {
          console.error("Failed to auto-save draft:", err);
        }
      }
    }, 30000); // 30 секунд

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [form]);

  // Загрузка черновика при монтировании
  useEffect(() => {
    if (!initial) {
      const draftKey = `template-draft-new`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm(parsed);
          lastSavedRef.current = draft;
        } catch (err) {
          console.error("Failed to load draft:", err);
        }
      }
    }
  }, [initial]);

  // Sanitize HTML для preview
  const preview = useMemo(() => {
    try {
      return DOMPurify.sanitize(form.html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style'],
      });
    } catch (err) {
      return form.html;
    }
  }, [form.html]);

  const handleTestWithAI = async () => {
    if (!templateId) {
      alert("Сначала сохрани шаблон, чтобы протестировать его с AI");
      return;
    }

    if (!form.schemaJson || form.schemaJson.trim().length === 0) {
      alert("Добавь Schema JSON для тестирования");
      return;
    }

    try {
      JSON.parse(form.schemaJson);
    } catch (err) {
      alert("JSON схема некорректна. Исправь и попробуй снова.");
      return;
    }

    setTestingAI(true);
    setTestResult(null);
    setTestMetadata(null);
    try {
      const result = await testTemplateWithAI({
        templateId,
        topic: testTopic,
        locale: "ru",
      });
      setTestResult(result.data ?? null);
      setTestMetadata(result.metadata ?? null);
    } catch (err: any) {
      console.error("Test with AI failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Не удалось протестировать шаблон с AI"
      );
    } finally {
      setTestingAI(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="space-y-4">
        <div className="grid gap-3">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Project SRS Template"
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium">Slug</label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="project-srs-template"
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="border rounded p-3 min-h-[84px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Краткое описание шаблона"
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium">HTML</label>
          <div className="border rounded overflow-hidden">
            <CodeMirror
              value={form.html}
              height="340px"
              extensions={[html()]}
              theme={oneDark}
              onChange={(value) => setForm({ ...form, html: value })}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
              }}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium">Schema JSON (для ИИ)</label>
          <div className="border rounded overflow-hidden">
            <CodeMirror
              value={form.schemaJson ?? ""}
              height="220px"
              extensions={[json()]}
              theme={oneDark}
              onChange={(value) => setForm({ ...form, schemaJson: value })}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
              }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Здесь ты описываешь структуру шаблона, которую потом будет заполнять ИИ.
            Поддерживаются поля: version, category, required, maxLength и другие.
          </p>
        </div>

        {/* Кнопка Test with AI */}
        {templateId && (
          <div className="grid gap-3 p-3 bg-slate-50 rounded border">
            <label className="text-sm font-medium">Test with AI</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border rounded px-3 py-2 text-sm"
                value={testTopic}
                onChange={(e) => setTestTopic(e.target.value)}
                placeholder="Опиши продукт для тестирования..."
              />
              <Button
                onClick={handleTestWithAI}
                disabled={testingAI}
                className="whitespace-nowrap"
              >
                {testingAI ? "Testing..." : "Test with AI"}
              </Button>
            </div>
            {testResult && (
              <div className="mt-2 p-3 bg-white rounded border text-xs space-y-2">
                <div className="font-medium">Результат заполнения:</div>
                <pre className="overflow-auto max-h-[200px]">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
                {testMetadata && (
                  <div className="text-xs text-slate-500">
                    <div>Модель: {testMetadata.model}</div>
                    <div>Попыток: {testMetadata.attempts}</div>
                    <div>Задержка: {testMetadata.latencyMs} ms</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={() => onSubmit(form)} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-medium opacity-80">Live preview</div>
        <div className="border rounded overflow-hidden min-h-[420px]">
          <iframe
            className="w-full h-[520px] bg-white"
            sandbox="allow-same-origin"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8" />
              <style>body{font-family:Inter,system-ui,Arial;padding:24px;line-height:1.6}</style>
            </head><body>${preview}</body></html>`}
          />
        </div>
      </Card>
    </div>
  );
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[а-яё]/g, (c) => ({ ё: "e" } as any)[c] || c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
