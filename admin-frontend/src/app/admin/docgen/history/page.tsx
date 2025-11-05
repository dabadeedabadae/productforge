"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";

type DocPackage = {
  id: number;
  concept: string;
  domain?: string | null;
  createdAt: string;
};

type DocPackageDetail = {
  id: number;
  concept: string;
  domain?: string | null;
  docs: any;
  createdAt: string;
};

export default function DocgenHistoryPage() {
  const [items, setItems] = useState<DocPackage[]>([]);
  const [selected, setSelected] = useState<DocPackageDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await api.get<DocPackage[]>("/ai/docgen/packages");
      setItems(data);
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await api.get<DocPackageDetail>(`/ai/docgen/packages/${id}`);
      setSelected(data);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Generated docs history</h1>
          <p className="text-sm text-slate-500 mt-1">
            Здесь видно все пакеты документации, которые были сгенерированы через AI Doc Generator.
          </p>
        </div>
        <Link href="/admin/docgen">
          <Button variant="secondary">← Назад в Docgen</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] gap-6">
        {/* Список пакетов */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Сгенерированные пакеты</div>
            <Button size="sm" variant="secondary" onClick={loadList} disabled={loadingList}>
              {loadingList ? "Обновление..." : "Обновить"}
            </Button>
          </div>
          <div className="border rounded max-h-[480px] overflow-y-auto divide-y">
            {items.length === 0 && (
              <div className="p-3 text-sm text-slate-500">
                Пока нет сгенерированных пакетов. Сначала сделай генерацию на странице Docgen.
              </div>
            )}
            {items.map((pkg) => {
              const active = selected?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => loadDetail(pkg.id)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    active ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">#{pkg.id}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(pkg.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 mt-1">
                    {pkg.concept}
                  </div>
                  {pkg.domain && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      Домен: {pkg.domain}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Детали выбранного пакета */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Детали пакета</div>
            {selected && (
              <div className="text-xs text-slate-500">
                ID: <span className="font-mono">{selected.id}</span>
              </div>
            )}
          </div>

          {!selected && !loadingDetail && (
            <div className="text-sm text-slate-500">
              Выбери пакет слева, чтобы посмотреть его содержимое.
            </div>
          )}

          {loadingDetail && (
            <div className="text-sm text-slate-500">Загрузка пакета…</div>
          )}

          {selected && !loadingDetail && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase text-slate-400 mb-1">Концепт</div>
                <div className="text-slate-800 whitespace-pre-wrap">
                  {selected.concept}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  Домен:{" "}
                  <span className="font-medium text-slate-700">
                    {selected.domain || "—"}
                  </span>
                </span>
                <span>
                  Создано:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(selected.createdAt).toLocaleString()}
                  </span>
                </span>
              </div>

              <div>
                <div className="text-xs uppercase text-slate-400 mb-1">
                  Документы (raw JSON)
                </div>
                <div className="border rounded bg-slate-950 text-slate-50 text-xs p-3 max-h-[400px] overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(selected.docs, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
