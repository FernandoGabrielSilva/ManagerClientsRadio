import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date-utils";
import { differenceInDays } from "date-fns";
import { ContractPdfUpload } from "@/components/contracts/contract-pdf-upload";
import { FileText as FileIcon } from "lucide-react";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;
  const contract = await prisma.contract.findFirst({ where: { id }, include: { client: true, vendor: true } });
  if (!contract) notFound();
  const days = differenceInDays(new Date(contract.endDate), new Date());
  const status = days < 0 ? "Vencido" : days <= 15 ? "Perto de Vencer" : "Ativo";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileIcon className="h-5 w-5" /></div>
        <div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight truncate">Contrato {contract.number ?? contract.id.slice(0, 8)}</h1><p className="text-sm text-muted-foreground truncate">{contract.client?.name}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader><CardContent>{contract.client?.name}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader><CardContent><Badge>{status}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dias restantes</CardTitle></CardHeader><CardContent>{days}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Início</CardTitle></CardHeader><CardContent>{formatDate(contract.startDate)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Término</CardTitle></CardHeader><CardContent>{formatDate(contract.endDate)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tipo</CardTitle></CardHeader><CardContent>{contract.mediaType}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>PDF do contrato</CardTitle></CardHeader>
        <CardContent>
          {contract.pdfName && <p className="text-sm mb-2">Arquivo: {contract.pdfName}</p>}
          <ContractPdfUpload contractId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
