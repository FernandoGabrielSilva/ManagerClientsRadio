import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ContractsToolbar } from "@/components/contracts/contracts-toolbar";
import { ContractTable } from "@/components/contracts/contract-table";

type View = "active" | "archived" | "trash";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
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
  const baseWhere = role === "admin" ? {} : { vendorId: userId };
  const where = { ...baseWhere, ...viewWhere };
  const [contracts, allContracts, clients] = await Promise.all([
    prisma.contract.findMany({ where, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } }),
    prisma.contract.findMany({ where: baseWhere, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-4">
      <ContractsToolbar contracts={contracts as any} exportContracts={allContracts as any} clients={clients} view={view} />
      <Card className="overflow-hidden"><CardContent className="p-0"><ContractTable contracts={contracts as any} view={view} /></CardContent></Card>
    </div>
  );
}
