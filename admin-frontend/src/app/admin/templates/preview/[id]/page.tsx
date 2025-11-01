"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTemplate } from "@/lib/templates";

export default function TemplatePreviewPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [tpl, setTpl] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await getTemplate(id);
      setTpl(data);
    })();
  }, [id]);

  if (!tpl) return <div className="p-6">Loading...</div>;

  const html =
    tpl.html ??
    tpl.contentHtml ??
    tpl.content ??
    "<p style='color:#94a3b8'>Empty template</p>";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Preview: {tpl.title}</h1>
      <div className="border rounded bg-white">
        <iframe
          srcDoc={html}
          className="w-full h-[70vh] rounded"
          sandbox=""
        />
      </div>
    </div>
  );
}
