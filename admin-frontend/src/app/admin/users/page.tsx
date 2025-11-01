// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

import { useRouter } from "next/navigation";

type User = { id: number; email: string; name: string; isActive: boolean };

export default function UsersPage() {
  const [data, setData] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErrText(null);
        const res = await api.get<User[]>("/users");
        if (!mounted) return;
        setData(res.data);
      } catch (e: any) {
        const s = e?.response?.status;
        if (s === 401) {
          // редирект только на 401 (неавторизован)
          router.replace("/login?next=/admin/users");
          return;
        }
        if (s === 403) {
          setErrText("Нет прав для просмотра пользователей (403). Попроси роль/разрешение.");
          return;
        }
        setErrText("Не удалось загрузить пользователей. Проверь консоль/Network.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) {
    return <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 p-6">Loading...</div>;
  }

  if (errText) {
    return (
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-red-300 p-6 text-red-700">
        {errText}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-3">{u.id}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3">{u.isActive ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
