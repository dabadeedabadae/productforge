"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { hasToken } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // guard только на клиенте
    if (!hasToken()) {
      router.replace("/login?next=" + encodeURIComponent(pathname || "/admin/dashboards"));
    } else {
      setReady(true);
    }
  }, [router, pathname]);

  if (!ready) return null; // без моргания

  return <AdminShell>{children}</AdminShell>;
}
