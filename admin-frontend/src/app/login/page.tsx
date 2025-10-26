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
      if (process.env.NODE_ENV !== "production") {
        console.log("LOGIN RESPONSE:", res.status, res.data);
      }
      const token = extractTokenFromAny(res.data);
      if (!token) throw new Error("No token in response");
      setToken(token);
      router.replace(next);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-4 rounded-[16px] border border-[#9C8A62]/40 bg-[#FAF9E4]/90 p-8 shadow-[0_8px_16px_rgba(156,138,98,0.15)] backdrop-blur-sm"
        >
          <h1 className="mb-4 text-center text-3xl font-bold text-[#9C8A62] tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
            Welcome to ProjectForge
          </h1>

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <Input
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          {err && (
            <div className="text-center text-sm text-red-600 bg-red-50/60 border border-red-200 rounded-md py-1">
              {err}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-[12px] text-lg font-semibold text-[#9C8A62]
                       bg-gradient-to-b from-[#FAF9E4] to-[#E8E3C0]
                       border border-[#9C8A62]/50
                       shadow-[0_4px_0_#C5B78A]
                       hover:from-[#F5F3D0] hover:to-[#E2DCB4]
                       hover:shadow-[0_3px_0_#B5A773,0_0_10px_rgba(255,245,200,0.4)]
                       active:translate-y-[2px] active:shadow-[0_1px_0_#B5A773]
                       transition-all duration-200 ease-in-out"
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center text-sm text-[#9C8A62]/80">
            Don’t have an account?{" "}
            <a
              href="/signup"
              className="font-semibold underline hover:text-[#7F704E] transition-colors"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

function BackgroundPattern() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,249,228,0.92), rgba(250,249,228,0.92)), url('/uzor.png')",
      }}
    />
  );
}
