"use client";
import { SetStateAction, useState} from "react";
import { api } from "@/lib/api";
import {setToken} from "@/lib/auth";
import { Button } from "@/components/Button";
import {Input} from "@/components/Input";


export default function LoginPage() {
    const [email, setEmail] = useState("admin@example.com");
    const [password, setPassword] = useState("Admin123!");
    const [err, setErr] = useState<string>();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(undefined);
        setLoading(true);
        try {
            const {data} = await api.post("/auth/login", {email, password});
            setToken(data.access_token);
            window.location.href = "/admin";
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="w-full max-w-sm rounded-2xl border p-6 shadow-sm space-y-3">
                <h1 className="text-2xl font-semibold">Admin Login</h1>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div>
                        <div className="text-sm font-medium mb-1">Email</div>
                        <Input value={email} onChange={(e: { target: { value: SetStateAction<string>; }; })=>setEmail(e.target.value)} />
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1">Password</div>
                        <Input type="password" value={password} onChange={(e: { target: { value: SetStateAction<string>; }; })=>setPassword(e.target.value)} />
                    </div>
                    {err && <p className="text-sm text-red-600">{err}</p>}
                    <Button disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
                </form>
            </div>
        </div>
    );
}
