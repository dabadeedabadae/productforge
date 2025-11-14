"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTemplate, updateTemplate } from "@/lib/templates";
import TemplateEditor, { type TemplateForm } from "@/components/admin/TemplateEditor";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [tpl, setTpl] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await getTemplate(id);
      setTpl(data);
    })();
  }, [id]);

  const handleSubmit = async (values: TemplateForm) => {
    setSaving(true);
    try {
      const html = values.html ?? "";

      let schemaJson: any = null;
      if (values.schemaJson && values.schemaJson.trim().length > 0) {
        try {
          schemaJson = JSON.parse(values.schemaJson);
        } catch (e) {
          alert("JSON в поле Schema JSON некорректный. Исправь и сохрани ещё раз.");
          return;
        }
      }

      await updateTemplate(id, {
        title: values.title?.trim() ?? "",
        slug: values.slug?.trim() ?? "",
        description: values.description?.trim() ?? "",
        html,
        schemaJson,
      });

      router.push("/admin/templates");
    } catch (err: any) {
      console.error("Update template failed:", err?.response?.data ?? err);
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Не удалось обновить шаблон (смотри консоль)"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!tpl) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">
        Edit template: {tpl.title ?? "Без названия"}
      </h1>
      <TemplateEditor
        submitting={saving}
        onSubmit={handleSubmit}
        templateId={id}
        initial={{
          title: tpl.title ?? "",
          slug: tpl.slug ?? "",
          description: tpl.description ?? "",
          html:
            (tpl as any).html ??
            (tpl as any).contentHtml ??
            (tpl as any).content ??
            "",
          schemaJson: tpl.schemaJson
            ? JSON.stringify(tpl.schemaJson, null, 2)
            : undefined,
        }}
      />
    </div>
  );
}
