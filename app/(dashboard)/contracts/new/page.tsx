import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ContractForm } from "@/components/contracts/contract-form";
import { FileText as FileIcon } from "lucide-react";

export default async function NewContractPage() {
  const clients = await prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const vendors = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileIcon className="h-5 w-5" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Novo contrato</h1><p className="text-sm text-muted-foreground">Registre um novo contrato comercial</p></div>
      </div>
      <Card><CardContent className="pt-6"><ContractForm clients={clients} vendors={vendors} /></CardContent></Card>
    </div>
  );
}
