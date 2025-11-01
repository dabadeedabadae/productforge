// src/app/api/admin/templates/store.ts

export type Template = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  html: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// чтобы и список, и /:id видели ОДНУ и ту же память
const g = globalThis as unknown as { __TEMPLATES__?: Template[] };

if (!g.__TEMPLATES__) {
  g.__TEMPLATES__ = [];
}

export const templates = g.__TEMPLATES__;
