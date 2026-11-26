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
  const role = (session!.user as { role?: string }).role;
  const where = role === "admin" ? { id } : { id, vendorId: userId };
  const contract = await prisma.contract.findFirst({ where, include: { client: true, vendor: true } });
  if (!contract) notFound();
  const days = differenceInDays(new Date(contract.endDate), new Date());
  const status = days < 0 ? "Vencido" : days <= 30 ? "Perto de Vencer" : "Ativo";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileIcon className="h-5 w-5" /></div>
        <div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight truncate">Contrato {contract.number ?? contract.id.slice(0, 8)}</h1><p className="text-sm text-muted-foreground truncate">{contract.client?.name}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cliente / Anunciante</CardTitle></CardHeader><CardContent>{contract.client?.name}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Vendedor Responsável</CardTitle></CardHeader><CardContent>{contract.sellerName ?? contract.vendor?.name ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader><CardContent><Badge>{status}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Programa / Faixa</CardTitle></CardHeader><CardContent>{contract.program ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dias restantes</CardTitle></CardHeader><CardContent>{days}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Duração</CardTitle></CardHeader><CardContent>{contract.durationMonths ? `${contract.durationMonths} mês(es)` : "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Início</CardTitle></CardHeader><CardContent>{formatDate(contract.startDate)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Término</CardTitle></CardHeader><CardContent>{formatDate(contract.endDate)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tipo de Mídia</CardTitle></CardHeader><CardContent>{contract.mediaType}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Inserções / Dia</CardTitle></CardHeader><CardContent>{contract.insertionsPerDay ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Inserções / Mês</CardTitle></CardHeader><CardContent>{contract.insertionsPerMonth ?? contract.insertions ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Horários de Veiculação</CardTitle></CardHeader><CardContent>{contract.timeSlots ?? "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Valor Mensal</CardTitle></CardHeader><CardContent>{contract.value != null ? `R$ ${contract.value.toLocaleString("pt-BR")}` : "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Valor Total / Bruto</CardTitle></CardHeader><CardContent>{contract.totalValue != null ? `R$ ${contract.totalValue.toLocaleString("pt-BR")}` : "—"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pagamento / Vencimento</CardTitle></CardHeader><CardContent>{contract.paymentInfo ?? "—"}</CardContent></Card>
      </div>
      {contract.notes && (
        <Card><CardHeader><CardTitle className="text-sm">Observações de Veiculação</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{contract.notes}</CardContent></Card>
      )}
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
