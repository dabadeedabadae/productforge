export default function AdminHome() {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="grid gap-2">
                <a className="underline" href="/admin/users">Users</a>
                <a className="underline" href="/admin/roles">Roles</a>
                <a className="underline" href="/admin/permissions">Permissions</a>
            </div>
        </div>
    );
}
