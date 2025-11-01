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
      const html =
        (values as any).html ??
        (values as any).contentHtml ??
        (values as any).content ??
        "";

      await updateTemplate(id, {
        title: values.title?.trim() ?? "",
        slug: values.slug?.trim() ?? "",
        description: values.description?.trim() ?? "",
        html,
      });

      router.push("/admin/templates");
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
        // 👇 вот тут главное — отдать редактору правильное поле
        initialValues={{
          title: tpl.title ?? "",
          slug: tpl.slug ?? "",
          description: tpl.description ?? "",
          html:
            (tpl as any).html ??
            (tpl as any).contentHtml ??
            (tpl as any).content ??
            "",
        }}
      />
    </div>
  );
}
