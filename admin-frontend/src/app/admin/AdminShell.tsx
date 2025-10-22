"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="h-dvh w-full overflow-hidden bg-neutral-50">
            {/* Topbar */}
            <Topbar onMenu={() => setOpen(true)} />

            <div className="flex h-[calc(100dvh-64px)]">
                {/* Sidebar (desktop) */}
                <aside className="hidden md:block w-64 shrink-0 border-r">
                    <Sidebar />
                </aside>

                {/* Sidebar (mobile offcanvas) */}
                {open && (
                    <div className="fixed inset-0 z-40 md:hidden">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setOpen(false)}
                        />
                        <div className="absolute inset-y-0 left-0 w-72 bg-slate-900 text-white shadow-xl">
                            <Sidebar onNavigate={() => setOpen(false)} />
                        </div>
                    </div>
                )}

                {/* Main content */}
                <main className="flex-1 overflow-auto">
                    <div className="max-w-6xl mx-auto p-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
