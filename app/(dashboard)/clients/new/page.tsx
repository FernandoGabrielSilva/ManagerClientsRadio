import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { Users as UsersIcon } from "lucide-react";

export default async function NewClientPage() {
  const vendors = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersIcon className="h-5 w-5" /></div>
        <div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight">Novo cliente</h1><p className="text-sm text-muted-foreground">Cadastre um novo cliente na carteira</p></div>
      </div>
      <Card><CardContent className="pt-6"><ClientForm vendors={vendors} /></CardContent></Card>
    </div>
  );
}
