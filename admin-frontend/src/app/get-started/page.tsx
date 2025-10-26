"use client";

import Link from "next/link";
import { useEffect } from "react";
import { hasToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export default function GetStartedPage() {
  const router = useRouter();

  useEffect(() => {
    if (hasToken()) router.replace("/admin/dashboards");
  }, [router]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[16px] border border-[#9C8A62]/40 bg-[#FAF9E4]/90 p-8 shadow-[0_8px_16px_rgba(156,138,98,0.15)] backdrop-blur-sm">
          <h2 className="mb-8 text-center text-3xl font-bold text-[#9C8A62] tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
            Welcome to ProjectForge
          </h2>

          <div className="grid gap-4">
            <Link href="/login">
              <Button
                className="w-full py-4 rounded-[12px] text-lg font-semibold text-[#9C8A62]
                           bg-gradient-to-b from-[#FAF9E4] to-[#E8E3C0]
                           border border-[#9C8A62]/50
                           shadow-[0_4px_0_#C5B78A]
                           hover:from-[#F5F3D0] hover:to-[#E2DCB4]
                           hover:shadow-[0_3px_0_#B5A773,0_0_10px_rgba(255,245,200,0.4)]
                           active:translate-y-[2px] active:shadow-[0_1px_0_#B5A773]
                           transition-all duration-200 ease-in-out"
              >
                Log in
              </Button>
            </Link>

            <Link href="/signup">
              <Button
                className="w-full py-4 rounded-[12px] text-lg font-semibold
                           text-[#9C8A62] bg-white border border-[#9C8A62]/40
                           hover:bg-[#F9F6E8] hover:shadow-[0_3px_0_#B5A773]
                           transition-all duration-200 ease-in-out"
              >
                Sign up
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-[#9C8A62]/80">
            You can log in later - click <span className="font-semibold">Sign up</span> to create an account.
          </p>
        </div>
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
