import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { daysSinceContact } from "@/lib/date-utils";
import { diffDays } from "@/lib/spreadsheet";
import {
  CLIENT_EVENT_PREFIXES,
  isManagedClientEventTitle,
} from "@/lib/client-events";
import {
  ensureClientContactEventsForUser,
  listEventsAction,
} from "@/app/actions/events";
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
import { DashboardReminders } from "@/components/dashboard/dashboard-reminders";
import { DashboardMiddle } from "@/components/dashboard/dashboard-middle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContractDaysFilter } from "@/components/dashboard/contract-days-filter";
import type { Client, Contract } from "@/generated/prisma/client";

type ContractWithClient = Contract & { client: Client };

const CONTRACT_DAYS_OPTIONS = [5, 10, 15, 30, 60, 90] as const;
const DEFAULT_CONTRACT_DAYS = 5;

function formatPiNumber(number: string | null): string {
  if (!number) return "PI —";
  return `PI ${number.replace(/^PI\s*/i, "")}`;
}

function contractDaysLabel(endDate: Date): { label: string; className: string } {
  const days = diffDays(endDate) ?? 0;
  const plural = (value: number) => `${value} ${value === 1 ? "dia" : "dias"}`;
  if (days < 0) {
    return {
      label: `Vencido há ${plural(Math.abs(days))}`,
      className: "text-destructive",
    };
  }
  if (days === 0) {
    return { label: "Vence hoje", className: "text-amber-500" };
  }
  return {
    label: `Faltam ${plural(days)}`,
    className: days <= 7 ? "text-amber-500" : "text-muted-foreground",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const query = await searchParams;
  const rawDays = Array.isArray(query.dias) ? query.dias[0] : query.dias;
  const parsedDays = Number.parseInt(rawDays ?? "", 10);
  const maxDays = CONTRACT_DAYS_OPTIONS.some((option) => option === parsedDays)
    ? parsedDays
    : DEFAULT_CONTRACT_DAYS;
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
  const reminders = await prisma.reminder.findMany({
    where: role === "admin" ? { deletedAt: null } : { userId, deletedAt: null },
    orderBy: { dueDate: "asc" },
    take: 8,
  });

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const latestSourceUpdate = Math.max(
    ...clients.map((c: Client) => c.updatedAt.getTime()),
    ...contracts.map((c: ContractWithClient) => c.updatedAt.getTime()),
    0,
  );
  const latestManagedEvent = await prisma.event.findFirst({
    where: {
      userId,
      OR: CLIENT_EVENT_PREFIXES.map((prefix) => ({
        title: { startsWith: prefix },
      })),
    },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (
    !latestManagedEvent ||
    latestManagedEvent.updatedAt.getTime() < latestSourceUpdate ||
    latestManagedEvent.updatedAt.getTime() < todayUtc.getTime()
  ) {
    await ensureClientContactEventsForUser(userId, role, {
      revalidate: false,
    });
  }

  const todayEvents = await listEventsAction(
    todayUtc.toISOString(),
    new Date(todayUtc.getTime() + 86400000 - 1).toISOString(),
  );
  const pendingActionEvents = todayEvents.filter(
    (event) => event.clientId && isManagedClientEventTitle(event.title),
  );
  const expiring = contracts
    .filter((c: ContractWithClient) => {
      const days = diffDays(c.endDate) ?? 0;
      return days >= 0 && days <= maxDays;
    })
    .sort(
      (a, b) =>
        new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
    );
  const activeCount = clients.filter(
    (c: Client) => c.contractStatus === "active",
  ).length;
  const visitsTodayCount = pendingActionEvents.filter((event) =>
    event.title.startsWith("Próxima ação:"),
  ).length;
  const videoTodayCount = pendingActionEvents.filter(
    (event) => event.type === "video",
  ).length;
  const contactOverdueCount = pendingActionEvents.filter((event) =>
    event.title.startsWith("Contatar:"),
  ).length;
  const syncKey = [
    ...clients.map((c: Client) =>
      [
        c.id,
        c.name,
        c.lastContactAt?.getTime(),
        c.nextContactAt?.getTime(),
        c.contactFrequencyDays,
        c.nextAction,
        c.nextActionDate?.getTime(),
        c.videoFrequency,
        c.videoWeekday,
        c.lastVideoSentAt?.getTime(),
        c.needsAdChange,
      ].join(":"),
    ),
    ...contracts.map((c: ContractWithClient) =>
      [c.id, c.number, new Date(c.endDate).getTime()].join(":"),
    ),
  ].join("|");

  const stats = [
    {
      label: "Visitas hoje",
      value: visitsTodayCount,
      icon: Phone,
      tone: "text-primary",
    },
    {
      label: "Vídeo hoje",
      value: videoTodayCount,
      icon: Video,
      tone: "text-primary",
    },
    {
      label: "Contato atrasado",
      value: contactOverdueCount,
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
        syncKey={syncKey}
        pendingActions={
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Ações pendentes</h2>
            <Card className="h-[360px]">
              <CardContent className="p-0 h-[360px] overflow-auto">
                {pendingActionEvents.length === 0 ? (
                  <div className="p-8 text-sm text-muted-foreground text-center">Nenhuma ação pendente.</div>
                ) : (
                  <div
                    role="region"
                    aria-label="Ações pendentes"
                    tabIndex={0}
                    className="max-h-[360px] divide-y overflow-auto"
                  >
                    {pendingActionEvents.map((event) => {
                      const client = event.client;
                      const overdue = event.title.startsWith("Contatar:");
                      const adChangeAction = event.title.startsWith("Sugerir mudança de anúncio:");
                      const video = event.type === "video";
                      const Icon = overdue
                        ? Phone
                        : adChangeAction
                          ? AlertTriangle
                          : video
                            ? Video
                            : CalendarDays;
                      const iconTone = overdue
                        ? "text-destructive"
                        : adChangeAction
                          ? "text-amber-500"
                          : "text-primary";
                      const days = overdue
                        ? daysSinceContact(client?.lastContactAt ?? null)
                        : null;
                      const badge = overdue
                        ? days !== null
                          ? `há ${days} dias`
                          : "atrasado"
                        : adChangeAction
                          ? "pendente"
                          : "Hoje";
                      let label = event.title;
                      if (overdue) label = `Contatar ${client?.name ?? "Cliente"}`;
                      else if (adChangeAction) label = `Sugerir mudança de anúncio ${client?.name ?? "Cliente"}`;
                      else if (video) label = `Enviar vídeo para ${client?.name ?? "Cliente"}`;
                      else if (event.title.startsWith("Último contato:")) label = `Último contato com ${client?.name ?? "Cliente"}`;
                      else if (event.title.startsWith("Próximo contato:")) label = `Próximo contato com ${client?.name ?? "Cliente"}`;
                      else if (event.title.startsWith("Próxima ação:")) label = `Próxima ação: ${client?.nextAction ?? "Visita"} · ${client?.name ?? "Cliente"}`;

                      return (
                        <Link
                          key={event.id}
                          href={`/clients/${event.clientId}`}
                          className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {badge}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Lembretes</h2>
          <Card>
            <CardContent className="p-4">
              <DashboardReminders reminders={reminders} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground/80">Contratos</h2>
            <ContractDaysFilter days={maxDays} options={CONTRACT_DAYS_OPTIONS} />
          </div>
          <Card>
            <CardContent className="p-0">
              {expiring.length === 0 ? (
                <p className="p-8 text-sm text-muted-foreground text-center">
                  Nenhum contrato vence em até {maxDays} dias.
                </p>
              ) : (
                <div
                  role="region"
                  aria-label="Contratos próximos do vencimento"
                  tabIndex={0}
                  className="max-h-[360px] divide-y overflow-auto"
                >
                  {expiring.map((c: ContractWithClient) => {
                    const days = contractDaysLabel(c.endDate);
                    return (
                      <Link
                        key={c.id}
                        href={`/contracts/${c.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium tabular-nums truncate">
                            {formatPiNumber(c.number)}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {c.client.name}
                          </span>
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-normal ${days.className}`}
                        >
                          {days.label}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
