"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TemplateEditor, { type TemplateForm } from "@/components/admin/TemplateEditor";
import { createTemplate } from "@/lib/templates";

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: TemplateForm) => {
    setSaving(true);
    try {
      const html =
        values.html ??
        (values as any).contentHtml ??
        (values as any).content ??
        "";

      // 👇 вот это главное
      let schemaJson: any = null;
      if (values.schemaJson && values.schemaJson.trim().length > 0) {
        try {
          schemaJson = JSON.parse(values.schemaJson);
        } catch (e) {
          alert("JSON в поле Schema JSON некорректный. Исправь и сохрани ещё раз.");
          return;
        }
      }

      await createTemplate({
        title: values.title?.trim() ?? "Untitled",
        slug: values.slug?.trim() ?? `template-${Date.now()}`,
        description: values.description?.trim() ?? "",
        html,
        isPublished: false,
        schemaJson, // 👈 теперь это объект, а не строка
      });

      router.push("/admin/templates");
    } catch (err: any) {
      console.error("Create template failed:", err?.response?.data ?? err);
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Не удалось создать шаблон (смотри консоль)"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">New Template</h1>
      <TemplateEditor onSubmit={handleSubmit} submitting={saving} />
    </div>
  );
}
