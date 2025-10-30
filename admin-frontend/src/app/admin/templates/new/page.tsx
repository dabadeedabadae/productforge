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
      const payload = {
        title: values.title?.trim() ?? "",
        slug: values.slug?.trim() ?? "",
        description: values.description?.trim() ?? "",
        // 👇 пробуем все популярные варианты из редактора
        html: values.html ?? (values as any).contentHtml ?? (values as any).content ?? "",
      };

      // на всякий пожарный: если html пустой — покажем сразу, чтобы не долбить бэк
      if (!payload.html) {
        alert("HTML/content is empty — редактор не вернул контент");
        return;
      }

      await createTemplate(payload);
      router.push("/admin/templates");
    } catch (err: any) {
      // тут вытащим, что сказал сервер
      console.error("Create template failed:", err?.response?.data ?? err);
      alert(
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          "Failed to create template (see console)"
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
