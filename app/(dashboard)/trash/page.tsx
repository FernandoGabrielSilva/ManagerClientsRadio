import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TrashView } from "@/components/trash/trash-view";

export default async function TrashPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const clientWhere = role === "admin" ? { deletedAt: { not: null } } : { OR: [{ userId }, { vendorId: userId }], deletedAt: { not: null } };
  const contractWhere = role === "admin" ? { deletedAt: { not: null } } : { vendorId: userId, deletedAt: { not: null } };
  const reminderWhere = role === "admin" ? { deletedAt: { not: null } } : { userId, deletedAt: { not: null } };

  const [clients, contracts, reminders] = await Promise.all([
    prisma.client.findMany({ where: clientWhere, include: { vendor: true }, orderBy: { name: "asc" } }),
    prisma.contract.findMany({ where: contractWhere, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } }),
    prisma.reminder.findMany({ where: reminderWhere, include: { client: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const items = [
    ...clients.map((c) => ({
      id: c.id,
      kind: "client" as const,
      typeLabel: "Cliente",
      title: c.name,
      subtitle: c.commercialStatus ?? c.contractStatus ?? "",
      deletedAt: c.deletedAt!,
    })),
    ...contracts.map((c) => ({
      id: c.id,
      kind: "contract" as const,
      typeLabel: "Contrato",
      title: c.client?.name ?? c.number ?? "Contrato",
      subtitle: c.number ?? "",
      deletedAt: c.deletedAt!,
    })),
    ...reminders.map((r) => ({
      id: r.id,
      kind: "reminder" as const,
      typeLabel: "Lembrete",
      title: r.title,
      subtitle: r.client?.name ?? "",
      deletedAt: r.deletedAt!,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Lixeira" description="Itens excluídos. Restaure ou exclua permanentemente." />
      <Card className="overflow-hidden"><CardContent className="p-0"><TrashView items={items} /></CardContent></Card>
    </div>
  );
}
