"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listTemplates, deleteTemplate } from "@/lib/templates";
import type { Template } from "@/types/template";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTemplates();

      // 👇 нормализуем что бы ни вернул бэк
      const normalized: Template[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];

      setItems(normalized);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <Link href="/admin/templates/new">
          <Button>New template</Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="p-6">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-6 opacity-70">No templates yet.</div>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id ?? t.slug} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm opacity-70">{t.slug}</div>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/admin/templates/preview/${t.id ?? t.slug}`}
                    className="underline text-sm self-center"
                  >
                    Preview
                  </Link>
                  <Link href={`/admin/templates/${t.id ?? t.slug}`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!confirm("Delete template?")) return;
                      await deleteTemplate(t.id ?? t.slug);
                      await load();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
