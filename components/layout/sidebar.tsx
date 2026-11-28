"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Radio } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isNavItemActive, navGroups } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Radio className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight tracking-tight">Raysse Manager</div>
            <div className="text-xs text-muted-foreground leading-tight">Gestão comercial</div>
          </div>
        </div>
      </div>
      <nav aria-label="Navegação principal" className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</div>
            {group.items.map((it) => {
              const Icon = it.icon;
              const active = isNavItemActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-colors motion-reduce:transition-none", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
        </button>
      </div>
    </aside>
  );
}
