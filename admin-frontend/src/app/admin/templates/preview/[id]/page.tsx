"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTemplate } from "@/lib/templates";
import DOMPurify from "dompurify";

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

  const rawHtml =
    tpl.html ??
    tpl.contentHtml ??
    tpl.content ??
    "<p style='color:#94a3b8'>Empty template</p>";

  // Sanitize HTML через DOMPurify
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style'],
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Preview: {tpl.title}</h1>
      <div className="border rounded bg-white">
        <iframe
          srcDoc={`<!doctype html><html><head><meta charset="utf-8" />
            <style>body{font-family:Inter,system-ui,Arial;padding:24px;line-height:1.6}</style>
          </head><body>${sanitizedHtml}</body></html>`}
          className="w-full h-[70vh] rounded"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
