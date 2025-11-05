// admin-frontend/src/app/admin/docgen/page.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

type DocKey = "srs" | "api" | "db" | "userflows";

type DocMeta = {
  templateId: number;
  title: string;
  data: any;
};

type DocgenResponse = {
  concept: string;
  domain?: string;
  generatedAt: string;
  docs: {
    [key in DocKey]?: DocMeta;
  } & Record<string, DocMeta>;
};

const DOC_OPTIONS: { key: DocKey; label: string }[] = [
  { key: "srs",       label: "SRS / ТЗ" },
  { key: "api",       label: "API спецификация" },
  { key: "db",        label: "Модель данных (DB)" },
  { key: "userflows", label: "Пользовательские сценарии" },
];

export default function DocgenPage() {
  const [concept, setConcept] = useState("");
  const [domain, setDomain] = useState("university");
  const [selectedDocs, setSelectedDocs] = useState<Record<DocKey, boolean>>({
    srs: true,
    api: true,
    db: true,
    userflows: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocgenResponse | null>(null);
  const [activeTab, setActiveTab] = useState<DocKey | null>("srs");

  const docsArray = DOC_OPTIONS.filter((d) => selectedDocs[d.key]).map((d) => d.key);

  const handleToggleDoc = (key: DocKey) => {
    setSelectedDocs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGenerate = async () => {
    if (!concept.trim()) {
      alert("Сначала опиши проект");
      return;
    }

    const docs = docsArray.length ? docsArray : (["srs", "api", "db"] as DocKey[]);
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<DocgenResponse>("/ai/docgen/generate", {
        concept,
        domain: domain || undefined,
        docs,
        locale: "ru",
      });

      setResult(res);

      // активная вкладка — первая, которая реально есть в ответе
      const availableDocKeys = docs.filter((k) => (res.docs as any)[k]);
      if (availableDocKeys.length) {
        setActiveTab(availableDocKeys[0]);
      } else {
        setActiveTab(null);
      }
    } catch (err: any) {
  console.error("Docgen error:", err?.response?.data ?? err);

  const data = err?.response?.data;
  let message = "Не удалось сгенерировать пакет документов";

  if (data) {
    // если message — строка
    if (typeof data.message === "string") {
      message = data.message;
    }
    // если message — объект вида { message, error, statusCode }
    else if (data.message && typeof data.message === "object") {
      const inner = data.message;
      if (typeof inner.message === "string") {
        message = inner.message;
      } else if (Array.isArray(inner.message)) {
        message = inner.message.join(", ");
      } else if (typeof inner.error === "string") {
        message = inner.error;
      }
    }
    // запасной вариант
    else if (typeof data.error === "string") {
      message = data.error;
    }
  }

  setError(message);
} finally {
  setLoading(false);
}

  };

  const activeDoc = activeTab && result ? (result.docs as any)[activeTab] as DocMeta : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Doc Generator</h1>
          <p className="text-sm text-slate-500 mt-1">
            Опиши идею проекта — система сгенерирует пакет документации (SRS, API, DB, userflows).
          </p>
        </div>
      </div>

      {/* Входные данные */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6">
        <Card className="p-4 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Описание проекта</label>
            <textarea
              className="border rounded px-3 py-2 min-h-[160px] text-sm"
              placeholder="Например: AI-ассистент для студентов, который отвечает на вопросы по учебному процессу, помогает с расписанием, заявками и т.д."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Домен / контекст (опционально)</label>
            <input
              className="border rounded px-3 py-2 text-sm"
              placeholder="university, fintech, e-commerce..."
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Какие документы генерировать</label>
            <div className="flex flex-wrap gap-3">
              {DOC_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleToggleDoc(opt.key)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    selectedDocs[opt.key]
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Если ничего не выбрано — по умолчанию будут сгенерированы SRS, API и DB.
            </p>
          </div>

          <div className="pt-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Генерация..." : "Сгенерировать пакет"}
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}
        </Card>

        {/* Краткий summary результата */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Статус / сводка</h2>
          {result ? (
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-400">Концепт</div>
                <div className="text-slate-800 line-clamp-3">{result.concept}</div>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>
                  Домен:{" "}
                  <span className="font-medium text-slate-700">
                    {result.domain || "—"}
                  </span>
                </span>
                <span>
                  Сгенерировано:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(result.generatedAt).toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Документы:{" "}
                {Object.keys(result.docs).length
                  ? Object.keys(result.docs).join(", ")
                  : "ничего не сгенерировано"}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Результат появится здесь после первой генерации.
            </div>
          )}
        </Card>
      </div>

      {/* Результаты по вкладкам */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Сгенерированные документы</h2>
        </div>

        {!result && (
          <div className="text-sm text-slate-500">
            Сначала запусти генерацию — сюда упадут SRS, API, DB и т.д. в виде JSON.
          </div>
        )}

        {result && (
          <>
            {/* Вкладки */}
            <div className="flex flex-wrap gap-2 border-b pb-2">
              {DOC_OPTIONS.map((opt) => {
                const hasDoc = !!(result.docs as any)[opt.key];
                if (!hasDoc) return null;
                const active = activeTab === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setActiveTab(opt.key)}
                    className={`px-3 py-1.5 text-xs rounded-t border-b-2 ${
                      active
                        ? "border-sky-600 text-sky-700 font-medium"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Тело активной вкладки */}
            {activeDoc ? (
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="border rounded bg-slate-950 text-slate-50 text-xs p-3 overflow-auto max-h-[480px]">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(activeDoc.data, null, 2)}
                  </pre>
                </div>
                <div className="text-xs text-slate-600 space-y-2">
                  <div>
                    <div className="font-medium text-slate-800 mb-1">Информация о шаблоне</div>
                    <div>ID шаблона: {activeDoc.templateId}</div>
                    <div>Название: {activeDoc.title}</div>
                  </div>
                  <p>
                    Сейчас показан сырой JSON, который вернул ИИ по структуре шаблона. Дальше ты
                    сможешь:
                  </p>
                  <ul className="list-disc list-inside">
                    <li>Сохранить это как документ в БД</li>
                    <li>Собрать HTML по шаблону с плейсхолдерами</li>
                    <li>Экспортировать в Markdown/PDF</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                Для выбранной вкладки пока нет данных.
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
