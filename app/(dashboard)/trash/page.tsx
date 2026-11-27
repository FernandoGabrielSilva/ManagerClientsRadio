import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ClientsTable } from "@/components/clients/clients-table";
import { ContractTable } from "@/components/contracts/contract-table";
import { RemindersView } from "@/components/reminders/reminders-view";

export default async function TrashPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const clientWhere = role === "admin" ? { deletedAt: { not: null } } : { OR: [{ userId }, { vendorId: userId }], deletedAt: { not: null } };
  const contractWhere = role === "admin" ? { deletedAt: { not: null } } : { vendorId: userId, deletedAt: { not: null } };
  const clients = await prisma.client.findMany({ where: clientWhere, orderBy: { name: "asc" }, include: { vendor: true } });
  const contracts = await prisma.contract.findMany({ where: contractWhere, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } });
  const reminderWhere = role === "admin" ? { deletedAt: { not: null } } : { userId, deletedAt: { not: null } };
  const reminders = await prisma.reminder.findMany({ where: reminderWhere, include: { client: true }, orderBy: { dueDate: "asc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lixeira</h1>
          <p className="text-sm text-muted-foreground">Itens excluídos. Restaure ou exclua permanentemente. Remoção automática após 30 dias.</p>
        </div>
      </div>
      <Card className="overflow-hidden"><CardContent className="p-0"><ClientsTable clients={clients as any} view="trash" /></CardContent></Card>
      <Card className="overflow-hidden"><CardContent className="p-0"><ContractTable contracts={contracts as any} view="trash" /></CardContent></Card>
      <Card className="overflow-hidden"><CardContent className="p-0"><RemindersView reminders={reminders as any} clients={[]} view="trash" /></CardContent></Card>
    </div>
  );
}
