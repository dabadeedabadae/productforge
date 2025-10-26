"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("User123!");
  const [name, setName] = useState("User");
  const [roleId, setRoleId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post("/auth/register", { email, password, name, roleId: Number(roleId) });
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.access_token);
      router.replace("/admin/dashboards");
    } catch (err) {
      alert("Registration failed. Check roleId and password policy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4">
        <form
          onSubmit={submit}
          className="w-full max-w-md space-y-4 rounded-[16px] border border-[#9C8A62]/40 bg-[#FAF9E4]/90 p-8 shadow-[0_8px_16px_rgba(156,138,98,0.15)] backdrop-blur-sm"
        >
          <h1 className="mb-4 text-center text-3xl font-bold text-[#9C8A62] tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
            Create Your Account
          </h1>

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />
          <Input
            value={roleId}
            onChange={(e) =>
              setRoleId(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Role ID (e.g. admin role)"
            type="number"
          />

          <Button
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
            {loading ? "Creating..." : "Create Account"}
          </Button>

          <p className="text-center text-sm text-[#9C8A62]/80">
            Already have an account?{" "}
            <a href="/login" className="font-semibold underline hover:text-[#7F704E] transition-colors">
              Log in
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
