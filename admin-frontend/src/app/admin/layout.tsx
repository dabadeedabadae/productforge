"use client";
import { useEffect } from "react";
import { hasToken, clearToken } from "@/lib/auth";
import { Button } from "@/components/Button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (!hasToken()) window.location.replace("/login");
    }, []);

    return (
        <div className="min-h-screen">
            <div className="flex items-center justify-between border-b p-4">
                <div className="font-semibold">Admin</div>
                <Button
                    className="bg-transparent text-black border"
                    onClick={() => { clearToken(); window.location.replace("/login"); }}
                >
                    Logout
                </Button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}
