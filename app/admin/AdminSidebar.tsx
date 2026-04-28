"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "System Overview", href: "/admin/system" },
  { label: "API Docs", href: "/admin/api-docs" },
  { label: "API Health", href: "/admin/health" },
  { label: "Architecture", href: "/admin/architecture" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar — hidden on mobile, fixed on sm+ */}
      <aside className="fixed inset-y-0 left-0 top-[57px] z-40 hidden w-56 border-r border-white/[0.06] bg-zinc-900 sm:block">
        <div className="flex flex-col gap-1 p-4">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-zinc-50 uppercase">
              Admin
            </h2>
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-medium text-amber-400">
              ADMIN
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-amber-500/10 font-medium text-amber-400"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
