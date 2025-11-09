'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function KBNewPage() {
  const [form, setForm] = useState({
    title: '', slug: '', summary: '', content: '',
    domain: '', solutionType: '', techStack: '{}',
    tags: '', categories: '',
  });
  const onChange = (k: string, v: string) => setForm(s => ({ ...s, [k]: v }));

  const onSave = async () => {
    const payload = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
      summary: form.summary,
      content: form.content,
      domain: form.domain || undefined,
      solutionType: form.solutionType || undefined,
      techStack: JSON.parse(form.techStack || '{}'),
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      categories: form.categories ? form.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    await api.post('/kb/items', payload);
    alert('Сохранено');
  };

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Новый элемент БЗ</h1>
      <input className="border p-2 rounded w-full" placeholder="Title" value={form.title} onChange={e=>onChange('title', e.target.value)} />
      <input className="border p-2 rounded w-full" placeholder="Slug"  value={form.slug}  onChange={e=>onChange('slug', e.target.value)} />
      <input className="border p-2 rounded w-full" placeholder="Domain (опц.)" value={form.domain} onChange={e=>onChange('domain', e.target.value)} />
      <input className="border p-2 rounded w-full" placeholder="Solution Type (опц.)" value={form.solutionType} onChange={e=>onChange('solutionType', e.target.value)} />
      <textarea className="border p-2 rounded w-full h-24" placeholder="Summary" value={form.summary} onChange={e=>onChange('summary', e.target.value)} />
      <textarea className="border p-2 rounded w-full h-40" placeholder="Content (Markdown)" value={form.content} onChange={e=>onChange('content', e.target.value)} />
      <textarea className="border p-2 rounded w-full h-24" placeholder='techStack JSON (например, {"backend":["NestJS"],"database":["PostgreSQL"]})' value={form.techStack} onChange={e=>onChange('techStack', e.target.value)} />
      <input className="border p-2 rounded w-full" placeholder="Tags через запятую" value={form.tags} onChange={e=>onChange('tags', e.target.value)} />
      <input className="border p-2 rounded w-full" placeholder="Categories через запятую" value={form.categories} onChange={e=>onChange('categories', e.target.value)} />
      <button onClick={onSave} className="px-4 py-2 rounded bg-black text-white">Сохранить</button>
    </div>
  );
}
