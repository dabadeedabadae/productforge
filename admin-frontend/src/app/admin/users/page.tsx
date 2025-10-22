"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

type User = { id:number; email:string; name:string; roleId:number; isActive:boolean; createdAt:string };

export default function UsersPage() {
    const [items, setItems] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string>();
    const [form, setForm] = useState({ email:"", password:"", name:"" });

    const load = async () => {
        setLoading(true); setErr(undefined);
        try {
            const { data } = await api.get<User[]>("/users");
            setItems(data);
        } catch (e:any) { setErr(e?.response?.data?.message || "Failed to load users"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/users", form);
            setForm({ email:"", password:"", name:"" });
            await load();
        } catch (e:any) { setErr(e?.response?.data?.message || "Create failed"); }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Users</h1>

            <Card className="p-4">
                <form onSubmit={create} className="flex gap-2 flex-wrap">
                    <Input placeholder="Email" value={form.email} onChange={e=>setForm(s=>({...s,email:e.target.value}))} />
                    <Input placeholder="Password" type="password" value={form.password} onChange={e=>setForm(s=>({...s,password:e.target.value}))} />
                    <Input placeholder="Name" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} />
                    <Button>Create</Button>
                </form>
            </Card>

            {err && <p className="text-sm text-red-600">{err}</p>}
            {loading ? <p>Loading…</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="p-2 text-left">ID</th>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">RoleId</th>
                            <th className="p-2 text-left">Active</th>
                            <th className="p-2 text-left">Created</th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map(u=>(
                            <tr key={u.id} className="border-t">
                                <td className="p-2">{u.id}</td>
                                <td className="p-2">{u.email}</td>
                                <td className="p-2">{u.name}</td>
                                <td className="p-2">{u.roleId}</td>
                                <td className="p-2">{u.isActive ? "Yes":"No"}</td>
                                <td className="p-2">{new Date(u.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
