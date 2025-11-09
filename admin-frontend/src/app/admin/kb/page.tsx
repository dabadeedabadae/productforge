'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type KBItem = {
  id: number; title: string; summary: string; solutionType?: string; domain?: string;
  tags: { tag: { name: string } }[];
  categories: { category: { name: string } }[];
};

export default function KBPage() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState('');

  const search = async () => {
    const res = await api.get('/kb/items', { params: { q, tag, category } });
    setItems(res);
  };

  useEffect(() => { search(); }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">База знаний</h1>
      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Поиск…" value={q} onChange={e => setQ(e.target.value)} />
        <input className="border rounded p-2" placeholder="Tag" value={tag} onChange={e => setTag(e.target.value)} />
        <input className="border rounded p-2" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} />
        <button onClick={search} className="px-4 py-2 rounded bg-black text-white">Найти</button>
      </div>

      <div className="grid gap-3">
        {items.map(it => (
          <div key={it.id} className="border rounded p-4">
            <div className="font-medium">{it.title}</div>
            <div className="text-sm opacity-70">{it.summary}</div>
            <div className="text-xs mt-2 flex gap-2 flex-wrap">
              {it.tags.map(t => <span key={t.tag.name} className="border px-2 py-0.5 rounded">{t.tag.name}</span>)}
              {it.categories.map(c => <span key={c.category.name} className="border px-2 py-0.5 rounded bg-neutral-100">{c.category.name}</span>)}
            </div>
            <div className="text-xs mt-1 opacity-70">
              {it.solutionType ? `Type: ${it.solutionType} • ` : ''}{it.domain ? `Domain: ${it.domain}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
