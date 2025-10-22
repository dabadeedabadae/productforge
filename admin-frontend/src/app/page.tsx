"use client";

import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/auth";
import { Button } from "@/components/Button";

export default function HomePage() {
  const router = useRouter();

  const onStart = () => {
    if (hasToken()) router.push("/admin/dashboards");
    else router.push("/get-started");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* фоновый паттерн */}
      <BackgroundPattern />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-28 md:pt-36">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-[0.08em] text-neutral-900">
          ProjectForce
        </h1>
        <p className="mt-8 max-w-3xl text-center text-xl md:text-3xl leading-snug text-stone-700/90 font-mono">
          Take the first step towards creating your own project.
        </p>

        <div className="mt-12">
          <Button
            className="h-auto px-10 py-6 text-2xl rounded-2xl border-2 border-stone-800/40 bg-amber-50 hover:bg-amber-100 shadow-[0_6px_0_#00000030] transition-all"
            onClick={onStart}
          >
            Start now
          </Button>
        </div>
      </div>
    </div>
  );
}

function BackgroundPattern() {
  // лёгкий «бумажный» паттерн без картинок
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(243,237,214,0.9), rgba(243,237,214,0.8)), repeating-linear-gradient(135deg, #f5f1df 0 18px, #ede6cf 18px 36px), radial-gradient(circle at 20% 10%, rgba(0,0,0,0.06), rgba(0,0,0,0) 40%)",
      }}
    />
  );
}
