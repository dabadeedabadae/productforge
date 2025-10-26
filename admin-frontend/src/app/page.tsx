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
      <BackgroundPattern />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-28 md:pt-36">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-[0.08em] text-neutral-900 drop-shadow-[0_2px_2px_rgba(255,255,255,0.6)]">
          ProjectForge
        </h1>
        <p className="mt-8 max-w-3xl text-center text-xl md:text-3xl leading-snug text-[#9C8A62] font-mono">
          Take the first step towards creating your own project.
        </p>

        <div className="mt-12">
          <Button
            className="px-10 py-6 text-2xl rounded-[16px] border border-[#9C8A62]/60 
                       bg-gradient-to-b from-[#FAF9E4] to-[#E8E3C0]
                       hover:from-[#F5F3D0] hover:to-[#E2DCB4]
                       text-[#9C8A62] font-semibold tracking-wide
                       shadow-[0_5px_0_#C5B78A,0_0_10px_rgba(255,245,200,0.4)]
                       hover:shadow-[0_4px_0_#B5A773,0_0_14px_rgba(255,245,200,0.6)]
                       active:translate-y-[2px] active:shadow-[0_2px_0_#B5A773]
                       transition-all duration-200 ease-in-out"
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
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,249,228,0.9), rgba(250,249,228,0.9)), url('/uzor.png')",
      }}
    />
  );
}
