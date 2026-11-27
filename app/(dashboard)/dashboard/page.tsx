import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  isContactOverdue,
  isContractExpiringSoon,
  isVideoDueToday,
  daysSinceContact,
  formatDate,
} from "@/lib/date-utils";
import { diffDays, toDate } from "@/lib/spreadsheet";
import Link from "next/link";
import {
  Video,
  Phone,
  FileText,
  Users,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { DashboardReminders } from "@/components/dashboard/dashboard-reminders";
import { DashboardMiddle } from "@/components/dashboard/dashboard-middle";
import { Card, CardContent } from "@/components/ui/card";
import type { Client, Contract, Notification } from "@prisma/client";

type ContractWithClient = Contract & { client: Client };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;
  const role = (session!.user as any).role;
  const where =
    role === "admin" ? { deletedAt: null, archivedAt: null } : { OR: [{ userId }, { vendorId: userId }], deletedAt: null, archivedAt: null };
  const clients: Client[] = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
  });
  const contracts: ContractWithClient[] = await prisma.contract.findMany({
    where:
      role === "admin"
        ? { deletedAt: null, archivedAt: null }
        : { vendorId: userId, deletedAt: null, archivedAt: null },
    include: { client: true },
  });
  const notifications: Notification[] = await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  const vendors = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const calendarClients = clients.map((c: Client) => ({
    id: c.id,
    name: c.name,
    lastContactAt: c.lastContactAt,
    contactFrequencyDays: c.contactFrequencyDays,
    vendorId: c.vendorId,
  }));
  const reminders = await prisma.reminder.findMany({
    where: role === "admin" ? { deletedAt: null } : { userId, deletedAt: null },
    orderBy: { dueDate: "asc" },
    take: 8,
  });

  const videoToday = clients.filter((c: Client) =>
    isVideoDueToday(c.videoWeekday),
  );
  const contactOverdue = clients.filter((c: Client) =>
    isContactOverdue(c.lastContactAt, c.contactFrequencyDays),
  );
  const visitsToday = clients.filter(
    (c: Client) => diffDays(toDate(c.nextActionDate)) === 0,
  );
  const expiring = clients.filter((c: Client) =>
    isContractExpiringSoon(c.contractEnd, 30),
  );
  const activeCount = clients.filter(
    (c: Client) => c.contractStatus === "active",
  ).length;
  const adChange = clients.filter((c: Client) => c.needsAdChange);

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const pendingDatedEvents = [
    ...visitsToday.map((c: Client) => {
      const actionLabel = c.nextAction ?? "Visita";
      return {
        id: `visit-${c.id}`,
        title: `${actionLabel}: ${c.name}`,
        start: new Date(c.nextActionDate as Date).toISOString(),
        type: "contact" as const,
        clientId: c.id,
        clientName: c.name,
        description: `${actionLabel} com ${c.name}.`,
      };
    }),
    ...videoToday.map((c: Client) => ({
      id: `video-${c.id}`,
      title: `Enviar vídeo: ${c.name}`,
      start: todayUtc.toISOString(),
      type: "video" as const,
      clientId: c.id,
      clientName: c.name,
      description: `Enviar vídeo para ${c.name}.`,
    })),
  ];

  const clientStatusCounts = clients.reduce<Record<string, number>>(
    (acc: Record<string, number>, c: Client) => {
      const key = c.commercialStatus ?? c.contractStatus ?? "Sem status";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const contractStatusCounts = contracts.reduce<Record<string, number>>(
    (acc: Record<string, number>, c: ContractWithClient) => {
      const days = Math.floor(
        (new Date(c.endDate).getTime() - Date.now()) / 86400000,
      );
      const key =
        days < 0 ? "Vencido" : days <= 30 ? "Perto de Vencer" : "Ativo";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const mediaTypeCounts = contracts.reduce<Record<string, number>>(
    (acc: Record<string, number>, c: ContractWithClient) => {
      const key = c.mediaType ?? "outro";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const totalValue = contracts.reduce(
    (s: number, c: ContractWithClient) => s + (c.value ?? 0),
    0,
  );

  const stats = [
    {
      label: "Visitas hoje",
      value: visitsToday.length,
      icon: Phone,
      tone: "text-primary",
    },
    {
      label: "Vídeo hoje",
      value: videoToday.length,
      icon: Video,
      tone: "text-primary",
    },
    {
      label: "Contato atrasado",
      value: contactOverdue.length,
      icon: Phone,
      tone: "text-destructive",
    },
    {
      label: "Contratos a vencer",
      value: expiring.length,
      icon: FileText,
      tone: "text-amber-500",
    },
    {
      label: "Clientes ativos",
      value: activeCount,
      icon: Users,
      tone: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Acompanhe as ações pendentes e o desempenho da carteira."
        actions={
          <span className="text-sm text-muted-foreground">
            {clients.length} clientes na base
          </span>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="overflow-hidden">
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted ${s.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">
                    {s.label}
                  </div>
                  <div className="text-2xl font-bold tabular-nums leading-tight">
                    {s.value}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardMiddle
        vendors={vendors as any}
        clients={calendarClients as any}
        pendingEvents={pendingDatedEvents}
        pendingActions={
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Ações pendentes</h2>
            <Card className="h-[360px]">
              <CardContent className="p-0 h-[360px] overflow-auto">
                {visitsToday.length === 0 && videoToday.length === 0 && contactOverdue.length === 0 && adChange.length === 0 ? (
                  <div className="p-8 text-sm text-muted-foreground text-center">Nenhuma ação pendente.</div>
                ) : (
                  <div className="max-h-[360px] overflow-auto divide-y">
                    {visitsToday.map((c: Client) => (
                      <Link key={`visit-${c.id}`} href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-sm transition-colors">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Visitar <span className="font-medium">{c.name}</span>{c.nextAction ? ` — ${c.nextAction}` : ""}</span>
                        <span className="text-xs text-muted-foreground shrink-0 rounded-full bg-muted px-2 py-0.5">Hoje</span>
                      </Link>
                    ))}
                    {videoToday.map((c: Client) => (
                      <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-sm transition-colors">
                        <Video className="h-4 w-4 text-primary shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Enviar vídeo para <span className="font-medium">{c.name}</span></span>
                        <span className="text-xs text-muted-foreground shrink-0 rounded-full bg-muted px-2 py-0.5">Hoje</span>
                      </Link>
                    ))}
                    {contactOverdue.map((c: Client) => (
                      <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-sm transition-colors">
                        <Phone className="h-4 w-4 text-destructive shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Contatar <span className="font-medium">{c.name}</span></span>
                        <span className="text-xs text-muted-foreground shrink-0 rounded-full bg-muted px-2 py-0.5">há {daysSinceContact(c.lastContactAt)} dias</span>
                      </Link>
                    ))}
                    {adChange.map((c: Client) => (
                      <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-sm transition-colors">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Sugerir mudança de anúncio <span className="font-medium">{c.name}</span></span>
                        <span className="text-xs text-muted-foreground shrink-0 rounded-full bg-muted px-2 py-0.5">pendente</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/80">Lembretes</h2>
        <Card>
          <CardContent className="p-4">
            <DashboardReminders reminders={reminders} />
          </CardContent>
        </Card>
      </section>

      {expiring.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">
            Contratos a vencer
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {expiring.map((c: Client) => (
                  <div
                    key={c.id}
                    className="flex justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {formatDate(c.contractEnd)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
