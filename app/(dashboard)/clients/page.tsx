import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ClientsToolbar } from "@/components/clients/clients-toolbar";
import { ClientsTable } from "@/components/clients/clients-table";

type View = "active" | "archived" | "trash";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const sp = await searchParams;
  const view: View = (sp?.view as View) || "active";
  const viewWhere =
    view === "archived"
      ? { archivedAt: { not: null }, deletedAt: null }
      : view === "trash"
      ? { deletedAt: { not: null } }
      : { archivedAt: null, deletedAt: null };
  const where =
    role === "admin"
      ? viewWhere
      : { OR: [{ userId }, { vendorId: userId }], ...viewWhere };
  const clients = await prisma.client.findMany({ where, orderBy: { name: "asc" }, include: { vendor: true } });
  const vendors = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <ClientsToolbar clients={clients} vendors={vendors} view={view} />
      <Card className="overflow-hidden"><CardContent className="p-0"><ClientsTable clients={clients} view={view} /></CardContent></Card>
    </div>
  );
}
