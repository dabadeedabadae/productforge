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
      // сразу логиним
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(ellipse_at_top,_#faf7ec,_#f1ebd6)] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-stone-700/20 bg-[#faf7ec]/90 p-6 shadow-xl"
      >
        <h1 className="mb-2 text-center text-2xl font-semibold">Sign up</h1>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <Input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
        <Input
          value={roleId}
          onChange={(e) => setRoleId(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Role ID (e.g. admin role)"
          type="number"
        />

        <Button disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create account"}
        </Button>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
