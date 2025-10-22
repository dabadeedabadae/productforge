"use client";
import AdminShell from "@/components/admin/AdminShell";

export default function DashboardsPage() {
    return (
        <AdminShell>
            {/* серый баннер наверху */}
            <div className="rounded-xl bg-slate-300/60 h-20 md:h-24" />

            {/* блоки-карточки */}
            <div className="mt-6 grid gap-6">
                <div className="rounded-xl bg-slate-100 p-4 shadow-sm ring-1 ring-black/5">
                    <div className="h-6 w-1/3 rounded-md bg-slate-200" />
                    <div className="mt-3 h-24 rounded-md bg-slate-200" />
                </div>

                <div className="rounded-xl bg-slate-100 p-4 shadow-sm ring-1 ring-black/5">
                    <div className="h-6 w-1/4 rounded-md bg-slate-200" />
                    <div className="mt-3 h-40 rounded-md bg-slate-200" />
                </div>

                <div className="rounded-xl bg-slate-100 p-4 shadow-sm ring-1 ring-black/5">
                    <div className="h-6 w-1/2 rounded-md bg-slate-200" />
                    <div className="mt-3 h-28 rounded-md bg-slate-200" />
                </div>
            </div>
        </AdminShell>
    );
}
