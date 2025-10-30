import api from "./api";       // 👈 default-импорт

export type Template = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  html: string;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
  isPublished?: boolean;
};

export async function listTemplates(): Promise<Template[]> {
  return api.get("/templates");
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
}): Promise<Template> {
  return api.post("/templates", payload);
}

export async function updateTemplate(
  id: number,
  payload: Partial<Pick<Template, "title" | "slug" | "description" | "html" | "isPublished">>
): Promise<Template> {
  return api.put(`/templates/${id}`, payload);
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}
