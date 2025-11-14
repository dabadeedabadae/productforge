import api from "./api";
import type { Template, TemplateSchemaJson } from "@/types/template";

export async function listTemplates(): Promise<Template[]> {
  const res = await api.get("/templates");
  // Nest сейчас отдаёт { items, total, page, limit }
  if (res && Array.isArray((res as any).items)) {
    return (res as any).items;
  }
  return Array.isArray(res) ? res : [];
}

export async function getTemplate(id: number): Promise<Template> {
  return api.get(`/templates/${id}`);
}

export async function createTemplate(payload: {
  title: string;
  slug: string;
  description?: string;
  html: string;
  isPublished?: boolean;
  schemaJson?: TemplateSchemaJson;
}): Promise<Template> {
  return api.post("/templates", payload);
}

export async function updateTemplate(
  id: number,
  payload: Partial<Pick<Template, "title" | "slug" | "description" | "html" | "isPublished" | "schemaJson">>
): Promise<Template> {
  return api.patch(`/templates/${id}`, payload);
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function testTemplateWithAI(params: {
  templateId: number;
  topic: string;
  locale?: string;
}): Promise<{ data: any; metadata: any; templateId: number; topic: string }> {
  const { templateId, ...body } = params;
  return api.post(`/templates/${templateId}/test-ai`, body);
}
