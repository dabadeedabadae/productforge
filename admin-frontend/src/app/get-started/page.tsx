"use client";

import Link from "next/link";
import { useEffect } from "react";
import { hasToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export default function GetStartedPage() {
  const router = useRouter();

  // если уже авторизован — не показываем этот экран
  useEffect(() => {
    if (hasToken()) router.replace("/admin/dashboards");
  }, [router]);

  return (
    <div className="relative min-h-[100dvh]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(250,247,236,1),_rgba(246,242,226,0.9))]" />
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-700/20 bg-[#faf7ec]/90 p-6 shadow-xl">
          <h2 className="mb-6 text-center text-2xl font-semibold">Welcome</h2>

          <div className="grid gap-3">
            <Link href="/login">
              <Button className="w-full">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="w-full bg-white text-black border">Sign up</Button>
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-stone-600">
            You can log in later — click Sign up to create an account.
          </p>
        </div>
      </div>
    </div>
  );
}
