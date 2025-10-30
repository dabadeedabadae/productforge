export type Template = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  contentHtml: string;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
};
