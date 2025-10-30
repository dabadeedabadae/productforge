"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTemplate } from "@/lib/templates";
import type { Template } from "@/types/template";
import { Card } from "@/components/Card";

export default function TemplatePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [tpl, setTpl] = useState<Template | null>(null);

  useEffect(() => {
    (async () => setTpl(await getTemplate(Number(id))))();
  }, [id]);

  if (!tpl) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{tpl.title}</h1>
      <Card>
        <iframe
          className="w-full min-h-[700px] bg-white"
          sandbox=""
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"/>
            <style>body{font-family:Inter,system-ui,Arial;padding:24px;line-height:1.6}</style>
          </head><body>${tpl.contentHtml}</body></html>`}
        />
      </Card>
    </div>
  );
}
