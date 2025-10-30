"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TemplateEditor, { TemplateForm } from "@/components/admin/TemplateEditor";
import { getTemplate, updateTemplate } from "@/lib/templates";
import type { Template } from "@/types/template";

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getTemplate(Number(id));
      setData(t);
    })();
  }, [id]);

  async function handleSubmit(values: TemplateForm) {
    setSaving(true);
    try {
      await updateTemplate(Number(id), values);
      router.push("/admin/templates");
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Edit: {data.title}</h1>
      <TemplateEditor
        submitting={saving}
        onSubmit={handleSubmit}
        initial={{
          title: data.title,
          slug: data.slug,
          description: data.description ?? "",
          contentHtml: data.contentHtml,
        }}
      />
    </div>
  );
}
