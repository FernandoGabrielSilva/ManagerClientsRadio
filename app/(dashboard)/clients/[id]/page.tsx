import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClientEditDialog } from "@/components/clients/client-edit-dialog";
import { ContactHistorySection } from "@/components/clients/contact-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markContactedAction, markVideoSentAction, toggleAdChangeAction } from "@/app/actions/clients";
import { formatDate, nextContactDate, isContactOverdue } from "@/lib/date-utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;
  const client = await prisma.client.findFirst({ where: { id, OR: [{ userId }, { vendorId: userId }] } });
  if (!client) notFound();
  const vendors = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const histories = await prisma.contactHistory.findMany({ where: { clientId: id }, include: { vendor: true }, orderBy: { date: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {client.name.slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{client.name}</h1>
            <p className="text-sm text-muted-foreground truncate">{client.tradeName ?? client.company ?? "Cliente"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClientEditDialog client={client} vendors={vendors} />
          <form action={async () => { "use server"; await markContactedAction(id); }}>
            <Button type="submit" variant="outline">Marcar contato hoje</Button>
          </form>
          <form action={async () => { "use server"; await markVideoSentAction(id); }}>
            <Button type="submit" variant="outline">Marcar vídeo enviado</Button>
          </form>
          <form action={async () => { "use server"; await toggleAdChangeAction(id, !client.needsAdChange); }}>
            <Button type="submit" variant={client.needsAdChange ? "default" : "outline"}>
              {client.needsAdChange ? "Ad change pendente" : "Marcar ad change"}
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Informações do cliente</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Razão Social</div><div className="font-medium">{client.legalName ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Nome Fantasia</div><div className="font-medium">{client.tradeName ?? client.name}</div></div>
            <div><div className="text-xs text-muted-foreground">CNPJ / CPF</div><div className="font-medium">{client.cnpj ?? "—"}</div></div>
            <div className="sm:col-span-2 lg:col-span-1"><div className="text-xs text-muted-foreground">Endereço</div><div className="font-medium">{client.address ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">E-mail</div><div className="font-medium">{client.email ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Vendedor / Representante</div><div className="font-medium">{client.responsible ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Contato responsável</div><div className="font-medium">{client.contactName ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Cargo / Setor</div><div className="font-medium">{client.contactRole ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Telefone / WhatsApp</div><div className="font-medium">{client.phone ? client.phone.replace(/\D/g, "").replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Situação comercial</div><div className="font-medium">{client.commercialStatus ?? client.contractStatus}</div></div>
            <div><div className="text-xs text-muted-foreground">Tipo de mídia ofertada</div><div className="font-medium">{client.offeredMediaType ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Valor mensal</div><div className="font-medium tabular-nums">{client.contractValue != null ? `R$ ${client.contractValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Valor total</div><div className="font-medium tabular-nums">{client.contractTotalValue != null ? `R$ ${client.contractTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Último contato</div><div className="font-medium">{formatDate(client.lastContactAt)}</div></div>
            <div><div className="text-xs text-muted-foreground">Tipo de contato</div><div className="font-medium">{client.contactType ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Próxima ação</div><div className="font-medium">{client.nextAction ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Data próxima ação</div><div className="font-medium">{formatDate(client.nextActionDate)}</div></div>
            <div><div className="text-xs text-muted-foreground">Próximo contato</div><div className="font-medium">{formatDate(nextContactDate(client.lastContactAt, client.contactFrequencyDays))} {isContactOverdue(client.lastContactAt, client.contactFrequencyDays) && <Badge variant="destructive" className="ml-2">Atrasado</Badge>}</div></div>
            <div><div className="text-xs text-muted-foreground">Último vídeo</div><div className="font-medium">{formatDate(client.lastVideoSentAt)}</div></div>
          </div>
        </CardContent>
      </Card>

      <ContactHistorySection clientId={id} histories={histories} />

    </div>
  );
}
