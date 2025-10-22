"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { extractTokenFromAny } from "@/lib/token";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin/dashboards";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });

      // подсветим, что реально приходит (в dev видно в консоли)
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("LOGIN RESPONSE:", res.status, res.data);
      }

      const token = extractTokenFromAny(res.data);

      if (!token) {
        throw new Error("No token in response");
      }

      setToken(token);
      router.replace(next);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-sm mx-auto">
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <Input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <Button type="submit" disabled={loading}>{loading ? "Logging in..." : "Log in"}</Button>
    </form>
  );
}
