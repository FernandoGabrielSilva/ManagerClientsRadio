import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { RemindersView } from "@/components/reminders/reminders-view";
import { Card, CardContent } from "@/components/ui/card";

export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const sp = await searchParams;
  const view = sp?.view || "active";
  const viewWhere =
    view === "archived"
      ? { archivedAt: { not: null }, deletedAt: null }
      : view === "trash"
      ? { deletedAt: { not: null } }
      : { archivedAt: null, deletedAt: null };
  const baseWhere = role === "admin" ? {} : { userId };
  const where = { ...baseWhere, ...viewWhere };
  const [reminders, clients] = await Promise.all([
    prisma.reminder.findMany({ where, include: { client: true }, orderBy: { dueDate: "asc" } }),
    prisma.client.findMany({ where: { deletedAt: null, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Lembretes" description="Crie, edite e exclua lembretes da sua agenda." />
      <Card><CardContent className="p-0"><RemindersView reminders={reminders} clients={clients} view={view} /></CardContent></Card>
    </div>
  );
}
