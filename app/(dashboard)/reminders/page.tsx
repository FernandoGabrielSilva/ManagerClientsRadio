import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { RemindersView } from "@/components/reminders/reminders-view";
import { Card, CardContent } from "@/components/ui/card";

export default async function RemindersPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const where = role === "admin" ? { deletedAt: null } : { userId, deletedAt: null };
  const [reminders, clients] = await Promise.all([
    prisma.reminder.findMany({ where, include: { client: true }, orderBy: { dueDate: "asc" } }),
    prisma.client.findMany({ where: { deletedAt: null, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Lembretes" description="Crie, edite e exclua lembretes da sua agenda." />
      <Card><CardContent className="p-0"><RemindersView reminders={reminders as any} clients={clients} /></CardContent></Card>
    </div>
  );
}
