// src/app/api/admin/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { templates, type Template } from "../store";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = Number(ctx.params.id);
  const tpl = templates.find((t) => t.id === id);

  if (!tpl) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // 👇 отдадим и html, и его алиасы
  return NextResponse.json(
    {
      data: {
        ...tpl,
        contentHtml: tpl.html,
        content: tpl.html,
      },
    },
    { status: 200 }
  );
}

export async function PUT(
  req: Request,
  ctx: { params: { id: string } }
) {
  const id = Number(ctx.params.id);
  const idx = templates.findIndex((t) => t.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const html =
    body.html ??
    body.contentHtml ??
    body.content ??
    templates[idx].html;

  const updated: Template = {
    ...templates[idx],
    ...body,
    html,
    updatedAt: new Date().toISOString(),
  };

  templates[idx] = updated;

  return NextResponse.json(
    {
      data: {
        ...updated,
        contentHtml: updated.html,
        content: updated.html,
      },
    },
    { status: 200 }
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const id = Number(ctx.params.id);
  const idx = templates.findIndex((t) => t.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  templates.splice(idx, 1);

  return NextResponse.json({ success: true }, { status: 200 });
}
