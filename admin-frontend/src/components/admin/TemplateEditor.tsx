"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export type TemplateForm = {
  title: string;
  slug: string;
  description?: string;
  html: string;            // 👈 ключевое: теперь html
};

type Props = {
  initial?: TemplateForm;
  onSubmit: (data: TemplateForm) => Promise<void>;
  submitting?: boolean;
};

export default function TemplateEditor({ initial, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<TemplateForm>(
    initial ?? { title: "", slug: "", description: "", html: "<h1>New Template</h1>" }
  );

  // авто-генерация slug
  useEffect(() => {
    if (!initial) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const preview = useMemo(() => form.html, [form.html]);

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
          <textarea
            className="border rounded p-3 min-h-[340px] font-mono text-sm"
            value={form.html}
            onChange={(e) => setForm({ ...form, html: e.target.value })}
            placeholder="<h1>Заголовок ТЗ</h1>..."
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={() => onSubmit(form)} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-medium opacity-80">Live preview</div>
        <div className="border rounded overflow-hidden min-h-[420px]">
          {/* На проде лучше прогонять через DOMPurify */}
          <iframe
            className="w-full h-[520px] bg-white"
            sandbox=""
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
