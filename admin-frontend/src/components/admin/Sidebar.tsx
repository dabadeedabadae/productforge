import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboards", label: "Dashboards", icon: HomeIcon },
  { href: "/admin/users",      label: "Users",      icon: HomeIcon },
  { href: "/admin/roles",      label: "Roles",      icon: HomeIcon },
  { href: "/admin/permissions",label: "Permissions",icon: HomeIcon },
];


export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="h-full bg-slate-900 text-slate-50">
      <div className="p-4 text-base font-semibold">Main</div>
      <nav className="space-y-1 px-2">
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm
                ${active ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3 10.5L12 4l9 6.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9.5Z"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
