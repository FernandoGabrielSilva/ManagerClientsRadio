"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, FileText, Settings, LogOut, Radio, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Visão geral" },
  { href: "/clients", label: "Clientes", icon: Users, hint: "Carteira" },
  { href: "/contracts", label: "Contratos", icon: FileText, hint: "Acordos" },
  { href: "/trash", label: "Lixeira", icon: Trash2, hint: "Excluídos" },
  { href: "/calendar", label: "Calendário", icon: CalendarDays, hint: "Agenda" },
  { href: "/settings", label: "Configurações", icon: Settings, hint: "Conta" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight tracking-tight">Raysse Manager</div>
            <div className="text-xs text-muted-foreground leading-tight">Gestão comercial</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || pathname?.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-primary/10 text-primary font-medium shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1 truncate">{it.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
