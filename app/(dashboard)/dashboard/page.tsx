import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isContactOverdue, isContractExpiringSoon, isVideoDueToday, daysSinceContact, formatDate } from "@/lib/date-utils";
import Link from "next/link";
import { Video, Phone, FileText, Users, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { Client, Contract, Notification } from "@prisma/client";

type ContractWithClient = Contract & { client: Client };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where = role === "admin" ? undefined : { OR: [{ userId }, { vendorId: userId }] };
  const clients: Client[] = await prisma.client.findMany({ where, orderBy: { name: "asc" } });
  const contracts: ContractWithClient[] = await prisma.contract.findMany({
    where: role === "admin" ? { deletedAt: null, archivedAt: null } : { vendorId: userId, deletedAt: null, archivedAt: null },
    include: { client: true },
  });
  const notifications: Notification[] = await prisma.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 6 });

  const videoToday = clients.filter((c: Client) => isVideoDueToday(c.videoWeekday));
  const contactOverdue = clients.filter((c: Client) => isContactOverdue(c.lastContactAt, c.contactFrequencyDays));
  const expiring = clients.filter((c: Client) => isContractExpiringSoon(c.contractEnd, 30));
  const activeCount = clients.filter((c: Client) => c.contractStatus === "active").length;
  const adChange = clients.filter((c: Client) => c.needsAdChange);

  const clientStatusCounts = clients.reduce<Record<string, number>>((acc: Record<string, number>, c: Client) => {
    const key = c.commercialStatus ?? c.contractStatus ?? "Sem status";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const contractStatusCounts = contracts.reduce<Record<string, number>>((acc: Record<string, number>, c: ContractWithClient) => {
    const days = Math.floor((new Date(c.endDate).getTime() - Date.now()) / 86400000);
    const key = days < 0 ? "Vencido" : days <= 15 ? "Perto de Vencer" : "Ativo";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mediaTypeCounts = contracts.reduce<Record<string, number>>((acc: Record<string, number>, c: ContractWithClient) => {
    const key = c.mediaType ?? "outro";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const totalValue = contracts.reduce((s: number, c: ContractWithClient) => s + (c.value ?? 0), 0);

  const stats = [
    { label: "Vídeo hoje", value: videoToday.length, icon: Video, tone: "text-primary" },
    { label: "Contato atrasado", value: contactOverdue.length, icon: Phone, tone: "text-destructive" },
    { label: "Contratos a vencer", value: expiring.length, icon: FileText, tone: "text-amber-500" },
    { label: "Clientes ativos", value: activeCount, icon: Users, tone: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Acompanhe as ações pendentes e o desempenho da carteira."
        actions={<span className="text-sm text-muted-foreground">{clients.length} clientes na base</span>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{s.value}</div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${s.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Ações pendentes</h2>
          <Card>
            <CardContent className="p-0">
              {videoToday.length === 0 && contactOverdue.length === 0 && adChange.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">Nenhuma ação pendente.</div>
              ) : (
                <div className="max-h-80 overflow-auto divide-y">
                  {videoToday.map((c: Client) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 text-sm transition-colors">
                      <span className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Enviar vídeo para <span className="font-medium">{c.name}</span></span>
                      <span className="text-xs text-muted-foreground">Hoje</span>
                    </Link>
                  ))}
                  {contactOverdue.map((c: Client) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 text-sm transition-colors">
                      <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-destructive" /> Contatar <span className="font-medium">{c.name}</span></span>
                      <span className="text-xs text-muted-foreground">há {daysSinceContact(c.lastContactAt)} dias</span>
                    </Link>
                  ))}
                  {adChange.map((c: Client) => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 text-sm transition-colors">
                      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Sugerir mudança de anúncio <span className="font-medium">{c.name}</span></span>
                      <span className="text-xs text-muted-foreground">pendente</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Notificações</h2>
          <Card>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">Sem notificações.</div>
              ) : (
                <div className="max-h-80 overflow-auto divide-y">
                  {notifications.map((n: Notification) => (
                    <div key={n.id} className="px-5 py-3 text-sm">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {[
          { title: "Clientes por situação", data: clientStatusCounts, colorOffset: 0 },
          { title: "Contratos por status", data: contractStatusCounts, colorOffset: 2 },
          { title: "Contratos por tipo", data: mediaTypeCounts, colorOffset: 4 },
        ].map((chart) => {
          const entries = Object.entries(chart.data) as [string, number][];
          const total = entries.reduce((s: number, [, v]) => s + v, 0) || 1;
          const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899"];
          let angle = 0;
          const slices = entries.map(([label, value], i) => {
            const startAngle = angle;
            const sliceAngle = (value / total) * 360;
            angle += sliceAngle;
            return { label, value, startAngle, sliceAngle, color: colors[(i + chart.colorOffset) % colors.length] };
          });
          function polar(cx: number, cy: number, r: number, deg: number) {
            const rad = ((deg - 90) * Math.PI) / 180;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
          }
          return (
            <section key={chart.title} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground/80">{chart.title}</h2>
              <Card>
                <CardContent className="p-4 flex flex-col items-center gap-4">
                  <svg viewBox="0 0 100 100" className="w-40 h-40">
                    {slices.map((sl, i) => {
                      if (sl.sliceAngle >= 359.99) {
                        return <circle key={i} cx="50" cy="50" r="40" fill={sl.color} />;
                      }
                      const start = polar(50, 50, 40, sl.startAngle);
                      const end = polar(50, 50, 40, sl.startAngle + sl.sliceAngle);
                      const largeArc = sl.sliceAngle > 180 ? 1 : 0;
                      const d = `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
                      return <path key={i} d={d} fill={sl.color} />;
                    })}
                    <circle cx="50" cy="50" r="22" fill="var(--background)" />
                  </svg>
                  <div className="w-full space-y-1">
                    {slices.map((sl) => (
                      <div key={sl.label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: sl.color }} />
                          {sl.label}
                        </span>
                        <span className="tabular-nums">{sl.value} ({Math.round((sl.value / total) * 100)}%)</span>
                      </div>
                    ))}
                    {entries.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
                  </div>
                  {chart.title === "Contratos por tipo" && (
                    <div className="text-xs text-muted-foreground">Valor total: R$ {totalValue.toLocaleString("pt-BR")}</div>
                  )}
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>

      {expiring.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground/80">Contratos a vencer</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {expiring.map((c: Client) => (
                  <div key={c.id} className="flex justify-between px-5 py-3 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums">{formatDate(c.contractEnd)}</span>
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
