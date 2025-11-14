// admin-frontend/src/app/admin/docgen/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { fetchChatSessions, ChatSessionSummary } from "@/lib/chat-tree";

type DocKey = "srs" | "api" | "db" | "userflows";
type DetailLevel = "BRIEF" | "STANDARD" | "DETAILED";

type PromptPreset = {
  id: number;
  name: string;
  description: string;
  documentType: string;
  version: string;
  isDefault: boolean;
};

type DocMeta = {
  templateId: number;
  title: string;
  data: any;
  markdown?: string;
  dataV2?: any;
  markdownV2?: string;
  promptPresetId?: number;
  promptPresetIdV2?: number;
};

type DocgenResponse = {
  id?: number;
  concept: string;
  domain?: string;
  detailLevel?: DetailLevel;
  generatedAt: string;
  docs: {
    [key in DocKey]?: DocMeta;
  } & Record<string, DocMeta>;
};

type RiskImpact = "low" | "medium" | "high";

type KBAnalyzeResponse = {
  id: number;
  tags: string[];
  categories: string[];
  solutionTypes: string[];
  complexity: {
    score: number;
    drivers: string[];
    effort_person_months: { min: number; max: number };
  };
  feasibility: {
    score: number;
    risks: { risk: string; impact: RiskImpact; mitigation: string }[];
  };
  similar: { id: number; similarity: number; reason: string }[];
  stack_recommendation: {
    backend: string[];
    frontend: string[];
    database: string[];
    services: string[];
  };
  summary: string;
};

type DocSection = {
  id: number;
  sectionId: string;
  sectionTitle: string;
  content: any;
  markdown?: string;
  documentType: string;
};

const DOC_OPTIONS: { key: DocKey; label: string; documentType: string }[] = [
  { key: "srs", label: "SRS / ТЗ", documentType: "SRS" },
  { key: "api", label: "API спецификация", documentType: "API" },
  { key: "db", label: "Модель данных (DB)", documentType: "DB" },
  { key: "userflows", label: "Пользовательские сценарии", documentType: "USERFLOWS" },
];

const DETAIL_LEVELS: { value: DetailLevel; label: string; description: string }[] = [
  { value: "BRIEF", label: "Краткий", description: "Минимум деталей" },
  { value: "STANDARD", label: "Стандартный", description: "Сбалансированный уровень" },
  { value: "DETAILED", label: "Детальный", description: "Максимум подробностей" },
];

// Простой Markdown renderer
function renderMarkdown(md: string): string {
  if (!md) return "";
  
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/gim, "</p><p>")
    .replace(/\n/gim, "<br/>");
}

function extractErrorMessage(err: any, fallback = "Произошла ошибка") {
  const data = err?.response?.data ?? err;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.join(", ");
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.statusText === "string") return data.statusText;
  return fallback;
}

export default function DocgenPage() {
  const [concept, setConcept] = useState("");
  const [domain, setDomain] = useState("university");
  const [selectedDocs, setSelectedDocs] = useState<Record<DocKey, boolean>>({
    srs: true,
    api: false,
    db: false,
    userflows: false,
  });
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("STANDARD");
  const [useABTest, setUseABTest] = useState(false);
  const [promptPresets, setPromptPresets] = useState<Record<string, PromptPreset[]>>({});
  const [selectedPresets, setSelectedPresets] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"json" | "markdown">("markdown");
  const [abViewVersion, setAbViewVersion] = useState<"v1" | "v2">("v1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocgenResponse | null>(null);
  const [activeTab, setActiveTab] = useState<DocKey | null>("srs");
  const [sections, setSections] = useState<Record<string, DocSection[]>>({});
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // KB анализ — стейты
  const [kb, setKb] = useState<KBAnalyzeResponse | null>(null);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Загружаем пресеты при монтировании
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const presetsByType: Record<string, PromptPreset[]> = {};
        for (const doc of DOC_OPTIONS) {
          const res = (await api.get(`/prompt-presets?documentType=${doc.documentType}`)) as PromptPreset[];
          presetsByType[doc.key] = res || [];
          // Устанавливаем дефолтный пресет
          const defaultPreset = Array.isArray(res) ? res.find((p: PromptPreset) => p.isDefault) : null;
          if (defaultPreset) {
            setSelectedPresets((prev) => ({ ...prev, [doc.key]: defaultPreset.id }));
          }
        }
        setPromptPresets(presetsByType);
      } catch (err) {
        console.error("Failed to load prompt presets:", err);
      }
    };
    loadPresets();
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const items = await fetchChatSessions();
        setSessions(items);
      } catch (err) {
        console.error("Failed to load sessions", err);
        setSessionsError("Не удалось загрузить историю веток");
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, []);

  // Загружаем секции после генерации
  useEffect(() => {
    if (result?.id) {
      const loadSections = async () => {
        try {
          for (const doc of DOC_OPTIONS) {
            if (selectedDocs[doc.key] && result.docs[doc.key]) {
              const res = (await api.get(
                `/ai/docgen/packages/${result.id}/sections?documentType=${doc.documentType}`
              )) as DocSection[];
              setSections((prev) => ({ ...prev, [doc.key]: Array.isArray(res) ? res : [] }));
            }
          }
        } catch (err) {
          console.error("Failed to load sections:", err);
        }
      };
      loadSections();
    }
  }, [result?.id, selectedDocs]);

  const docsArray = DOC_OPTIONS.filter((d) => selectedDocs[d.key]).map((d) => d.key);

  const handleToggleDoc = (key: DocKey) => {
    setSelectedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!concept.trim()) {
      alert("Сначала опиши проект");
      return;
    }

    const docs = docsArray.length ? docsArray : (["srs"] as DocKey[]);
    setLoading(true);
    setError(null);

    try {
      const promptPresetIds: Record<string, number> = {};
      for (const docKey of docs) {
        if (selectedPresets[docKey]) {
          promptPresetIds[docKey] = selectedPresets[docKey];
        }
      }

      const res = (await api.post("/ai/docgen/generate", {
        concept,
        domain: domain || undefined,
        docs,
        locale: "ru",
        detailLevel: detailLevel,
        promptPresetIds: Object.keys(promptPresetIds).length > 0 ? promptPresetIds : undefined,
        useABTest,
      })) as DocgenResponse;

      setResult(res);

      // активная вкладка — первая, которая реально есть в ответе
      const availableDocKeys = docs.filter((k) => (res.docs as any)[k]);
      setActiveTab(availableDocKeys.length ? availableDocKeys[0] : null);
    } catch (err: any) {
      console.error("Docgen error:", err?.response?.data ?? err);
      setError(extractErrorMessage(err, "Не удалось сгенерировать пакет документов"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSection = async (sectionId: string, documentType: string) => {
    if (!result?.id) return;

    setRegeneratingSection(`${documentType}-${sectionId}`);
    try {
      const res = (await api.patch(
        `/ai/docgen/packages/${result.id}/sections/${documentType}/${sectionId}/regenerate`,
        {
          locale: "ru",
        }
      )) as { content: any; markdown?: string };

      // Обновляем результат
      if (result.docs[activeTab as DocKey]) {
        const doc = result.docs[activeTab as DocKey]!;
        if (doc.data) {
          doc.data[sectionId] = res.content;
          if (res.markdown) {
            doc.markdown = res.markdown;
          }
        }
        setResult({ ...result });
      }

      // Обновляем секции
      const docKey = DOC_OPTIONS.find((d) => d.documentType === documentType)?.key;
      if (docKey) {
        const updatedSections = (await api.get(
          `/ai/docgen/packages/${result.id}/sections?documentType=${documentType}`
        )) as DocSection[];
        setSections((prev) => ({ ...prev, [docKey]: Array.isArray(updatedSections) ? updatedSections : [] }));
      }
    } catch (err: any) {
      console.error("Regenerate section error:", err);
      alert(extractErrorMessage(err, "Не удалось регенерировать секцию"));
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleAnalyzeKB = async () => {
    if (!concept.trim()) {
      alert("Сначала опиши проект");
      return;
    }
    setKbLoading(true);
    setKbError(null);
    try {
      const res = (await api.post("/ai/kb/analyze", {
        concept,
        domain: domain || undefined,
        locale: "ru",
      })) as KBAnalyzeResponse;
      setKb(res);
    } catch (err: any) {
      console.error("KB analyze error:", err?.response?.data ?? err);
      setKbError(extractErrorMessage(err, "Не удалось выполнить анализ KB"));
    } finally {
      setKbLoading(false);
    }
  };

  const activeDoc = activeTab && result ? ((result.docs as any)[activeTab] as DocMeta) : null;
  const activeSections = activeTab ? sections[activeTab] || [] : [];
  const hasABTest = activeDoc && activeDoc.dataV2;

  // Определяем какой контент показывать
  const displayData = hasABTest && abViewVersion === "v2" ? activeDoc?.dataV2 : activeDoc?.data;
  const displayMarkdown = hasABTest && abViewVersion === "v2" ? activeDoc?.markdownV2 : activeDoc?.markdown;

  return (
    <div className="mx-auto w-full max-w-none p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Doc Generator</h1>
          <p className="text-sm text-slate-500 mt-1">
            Опиши идею проекта — система сгенерирует пакет документации с управляемым уровнем детализации.
          </p>
        </div>
      </div>

      {/* Входные данные */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6">
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
            <label className="text-sm font-medium">Уровень детализации</label>
            <div className="flex gap-2">
              {DETAIL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setDetailLevel(level.value)}
                  className={`px-3 py-1.5 rounded text-xs border ${
                    detailLevel === level.value
                      ? "bg-sky-600 text-white border-sky-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                  title={level.description}
                >
                  {level.label}
                </button>
              ))}
            </div>
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
          </div>

          {/* Выбор пресетов для каждого типа документа */}
          {docsArray.map((docKey) => {
            const docOption = DOC_OPTIONS.find((d) => d.key === docKey);
            const presets = promptPresets[docKey] || [];
            if (presets.length === 0) return null;

            return (
              <div key={docKey} className="grid gap-2">
                <label className="text-sm font-medium">
                  Пресет промпта для {docOption?.label}
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={selectedPresets[docKey] || ""}
                  onChange={(e) =>
                    setSelectedPresets((prev) => ({
                      ...prev,
                      [docKey]: Number(e.target.value),
                    }))
                  }
                >
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} {preset.isDefault ? "(по умолчанию)" : ""} - v{preset.version}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ab-test"
              checked={useABTest}
              onChange={(e) => setUseABTest(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="ab-test" className="text-sm font-medium cursor-pointer">
              A/B тест (сгенерировать две версии для сравнения)
            </label>
          </div>

          <div className="pt-2 flex gap-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Генерация..." : "Сгенерировать пакет"}
            </Button>
            <Button
              onClick={handleAnalyzeKB}
              disabled={kbLoading}
              className="border border-slate-300 bg-white text-slate-700"
            >
              {kbLoading ? "Анализируем…" : "Анализ (KB)"}
            </Button>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}
          {kbError && <div className="text-sm text-red-500">{kbError}</div>}
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
              </div>
              <div className="text-xs text-slate-500">
                <div>
                  Детализация:{" "}
                  <span className="font-medium text-slate-700">
                    {DETAIL_LEVELS.find((l) => l.value === result.detailLevel)?.label || result.detailLevel || "—"}
                  </span>
                </div>
                <div className="mt-1">
                  Сгенерировано:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(result.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Документы:{" "}
                {Object.keys(result.docs).length
                  ? Object.keys(result.docs).join(", ")
                  : "ничего не сгенерировано"}
              </div>

              {/* Блок сводки по KB */}
              {kb && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  <div className="text-xs uppercase text-slate-400">Анализ KB</div>
                  <div className="text-xs">
                    <div>
                      <span className="text-slate-500">Сложность: </span>
                      <span className="font-medium text-slate-800">
                        {kb.complexity?.score ?? "—"} / 5
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-500">Feasibility: </span>
                      <span className="font-medium text-slate-800">
                        {kb.feasibility?.score != null
                          ? kb.feasibility.score.toFixed(2)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Результат появится здесь после первой генерации.
            </div>
          )}
        </Card>
      </div>

      {/* Результаты по вкладкам */}
      {result && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Сгенерированные документы</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode("markdown")}
                className={`px-3 py-1 text-xs rounded border ${
                  viewMode === "markdown"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setViewMode("json")}
                className={`px-3 py-1 text-xs rounded border ${
                  viewMode === "json"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                JSON
              </button>
            </div>
          </div>

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

          {/* A/B переключатель */}
          {hasABTest && (
            <div className="flex gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setAbViewVersion("v1")}
                className={`px-3 py-1 text-xs rounded border ${
                  abViewVersion === "v1"
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Версия 1
              </button>
              <button
                type="button"
                onClick={() => setAbViewVersion("v2")}
                className={`px-3 py-1 text-xs rounded border ${
                  abViewVersion === "v2"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                Версия 2
              </button>
            </div>
          )}

          {/* Тело активной вкладки */}
          {activeDoc ? (
            <div className="mt-3 space-y-3">
              {viewMode === "markdown" && displayMarkdown ? (
                <div className="border rounded bg-white p-4 prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayMarkdown) }} />
                </div>
              ) : (
                <div className="border rounded bg-slate-950 text-slate-50 text-xs p-3 overflow-auto max-h-[600px]">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(displayData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Секции с возможностью регенерации */}
              {activeSections.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-semibold">Секции документа</h3>
                  <div className="space-y-2">
                    {activeSections.map((section) => (
                      <div key={section.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{section.sectionTitle}</div>
                          <button
                            type="button"
                            onClick={() => handleRegenerateSection(section.sectionId, section.documentType)}
                            disabled={regeneratingSection === `${section.documentType}-${section.sectionId}`}
                            className="px-2 py-1 text-xs rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {regeneratingSection === `${section.documentType}-${section.sectionId}`
                              ? "Регенерация..."
                              : "Регенерировать"}
                          </button>
                        </div>
                        {section.markdown && viewMode === "markdown" ? (
                          <div
                            className="text-xs prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(section.markdown) }}
                          />
                        ) : (
                          <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto">
                            {JSON.stringify(section.content, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              Для выбранной вкладки пока нет данных.
            </div>
          )}
        </Card>
      )}

      {/* (Опц.) Отдельная карточка рисков из анализа KB */}
      {kb?.feasibility?.risks?.length ? (
        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-semibold">Риски и меры (KB)</h2>
          <div className="text-xs">
            <ul className="space-y-2">
              {kb.feasibility.risks.map((r, i) => (
                <li key={i} className="border rounded p-2">
                  <div className="font-medium">{r.risk}</div>
                  <div className="text-slate-500">Impact: {r.impact}</div>
                  <div>Mitigation: {r.mitigation}</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">История веток</h2>
          <Button
            onClick={() => window.location.reload()}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            Обновить
          </Button>
        </div>
        {sessionsLoading ? (
          <p className="text-sm text-slate-500">Загружаем сессии…</p>
        ) : sessionsError ? (
          <p className="text-sm text-red-500">{sessionsError}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет сохранённых веток.</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-medium text-slate-700">{session.title || "Без названия"}</div>
                  <div className="text-xs text-slate-500">Обновлено: {new Date(session.updatedAt).toLocaleString()}</div>
                </div>
                <Link
                  href={`/docgen/chat/${session.id}`}
                  className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Открыть ветки
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
