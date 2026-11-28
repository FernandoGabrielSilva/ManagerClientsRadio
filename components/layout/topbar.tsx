"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Menu, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "@/components/ui/toast";
import { getUnreadNotificationsAction } from "@/app/actions/notifications";
import { clearCompletedBackgroundJobsAction, getBackgroundJobsAction } from "@/app/actions/background-jobs";
import { BackgroundJobStatus } from "@/components/settings/background-job-status";
import { cn } from "@/lib/utils";
import { isNavItemActive, navGroups } from "@/lib/navigation";

type BackgroundJob = Awaited<ReturnType<typeof getBackgroundJobsAction>>[number];

export function Topbar({ user, notifications }: { user: { name?: string | null; email?: string | null; image?: string | null }; notifications?: { id: string; title: string; message: string; read: boolean; link: string | null; createdAt: Date | string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const refreshJobs = useCallback(async () => {
    try {
      setJobs(await getBackgroundJobsAction());
    } catch {
      toast.add({ title: "Erro", description: "Não foi possível atualizar as tarefas em segundo plano." });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refreshJobs());
    const t = setInterval(() => void refreshJobs(), 4000);
    return () => clearInterval(t);
  }, [refreshJobs]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (localStorage.getItem("browserNotifEnabled") === "false") return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    let seen = new Set<string>();
    try {
      const raw = localStorage.getItem("seenNotifIds");
      if (raw) seen = new Set(JSON.parse(raw));
    } catch {}
    let cancelled = false;
    async function check() {
      if (Notification.permission !== "granted") return;
      try {
        const items = await getUnreadNotificationsAction();
        if (cancelled) return;
        let changed = false;
        for (const n of items) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            changed = true;
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.ready
                .then((reg) => reg.showNotification(n.title, { body: n.message }))
                .catch(() => new Notification(n.title, { body: n.message }));
            } else {
              new Notification(n.title, { body: n.message });
            }
          }
        }
        if (changed) localStorage.setItem("seenNotifIds", JSON.stringify([...seen]));
      } catch {}
    }
    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-5 py-5 border-b">
              <SheetTitle className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Radio className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Raysse Manager</div>
                  <div className="text-xs text-muted-foreground font-normal">Gestão comercial</div>
                </div>
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Navegação principal" className="px-3 py-3 space-y-3">
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
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" /> {it.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-auto p-3 border-t">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
              </button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Painel de gestão</span>
      </div>
      <div className="flex items-center gap-2">
        {(() => {
          if (jobs.length === 0) return null;
          const activeJobs = jobs.filter((j) => j.status === "pending" || j.status === "running");
          const avg = activeJobs.length ? Math.round(activeJobs.reduce((a, j) => a + (j.total > 0 ? Math.min(100, (j.processed / j.total) * 100) : (j.progress ?? 0)), 0) / activeJobs.length) : 100;
          const r = 16; const c = 2 * Math.PI * r; const off = c - (avg / 100) * c;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-full h-9 w-9 hover:bg-muted relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Progresso em segundo plano: ${avg}%${activeJobs.length ? `, ${activeJobs.length} tarefa(s) em andamento` : ""}`}
              >
                <span
                  role="progressbar"
                  aria-label="Progresso médio das tarefas"
                  aria-valuenow={avg}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="inline-flex"
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r={r} stroke="currentColor" strokeWidth="3" fill="none" className="text-muted/40" />
                    <circle cx="18" cy="18" r={r} stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="text-primary transition-all motion-reduce:transition-none" />
                  </svg>
                  <span className="absolute text-[9px] font-medium" aria-hidden="true">{avg}%</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm sm:w-96 p-2">
                <DropdownMenuGroup><DropdownMenuLabel>Progresso em segundo plano</DropdownMenuLabel></DropdownMenuGroup>
                <DropdownMenuSeparator />
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {jobs.map((j) => <BackgroundJobStatus key={j.id} jobId={j.id} onDone={refreshJobs} />)}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await clearCompletedBackgroundJobsAction();
                      await refreshJobs();
                      toast.add({ title: "Tarefas concluídas removidas" });
                    } catch (error) {
                      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado." });
                    }
                  }}
                >
                  Limpar concluídas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-full h-9 w-9 hover:bg-muted relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lida(s)` : ""}`}
          >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
              )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm sm:w-80">
            <DropdownMenuGroup><DropdownMenuLabel>Notificações</DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator />
            {(notifications ?? []).length === 0 && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">Sem notificações.</div>
            )}
            {(notifications ?? []).map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2" onClick={() => { if (n.link) router.push(n.link); }}>
                <span className={cn("text-sm font-medium", n.read && "text-muted-foreground")}>{n.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/notifications")}>Ver todas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Menu do usuário" className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user.name ?? user.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-xs sm:w-56">
            <DropdownMenuGroup><DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name ?? "Usuário"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>Configurações</DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
