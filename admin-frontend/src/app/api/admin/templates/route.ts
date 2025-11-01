// src/app/api/admin/templates/route.ts
import { NextResponse } from "next/server";
import { templates, type Template } from "./store";

export async function GET() {
  return NextResponse.json({ data: templates }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || !body.title || !body.slug) {
    return NextResponse.json(
      { error: "title and slug are required" },
      { status: 400 }
    );
  }

  // 👇 тут самое важное: собрали html из всех возможных имён
  const html =
    body.html ??
    body.contentHtml ??
    body.content ??
    "";

  const now = new Date().toISOString();

  const item: Template = {
    id: Date.now(),
    title: body.title,
    slug: body.slug,
    description: body.description ?? "",
    html,
    isPublished: body.isPublished ?? false,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(item);

  // 👇 и тут возвращаем все алиасы, чтобы клиентам было удобно
  return NextResponse.json(
    {
      data: {
        ...item,
        contentHtml: item.html,
        content: item.html,
      },
    },
    { status: 201 }
  );
}
