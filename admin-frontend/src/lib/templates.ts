import api from "./api";

export type Template = {
  id: number;
  title: string;
  slug: string;
  description: string;
  html: string;
  isPublished: boolean;
  schemaJson?: any;
  createdAt: string;
  updatedAt: string;
  createdById?: number | null;
};

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
  schemaJson?: any;
}): Promise<Template> {
  return api.post("/templates", payload);
}


export async function updateTemplate(
  id: number,
  payload: Partial<Pick<Template, "title" | "slug" | "description" | "html" | "isPublished" | "schemaJson">>
): Promise<Template> {
  return api.put(`/templates/${id}`, payload);
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}
