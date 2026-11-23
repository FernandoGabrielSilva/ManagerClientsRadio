import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
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
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {client.name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.tradeName ?? client.company ?? "Cliente"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
            <div><div className="text-xs text-muted-foreground">Responsável</div><div className="font-medium">{client.responsible ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Contato / decisor</div><div className="font-medium">{client.contactName ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">WhatsApp</div><div className="font-medium">{client.phone ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Situação comercial</div><div className="font-medium">{client.commercialStatus ?? client.contractStatus}</div></div>
            <div><div className="text-xs text-muted-foreground">Valor proposto</div><div className="font-medium tabular-nums">{client.contractValue ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Último contato</div><div className="font-medium">{formatDate(client.lastContactAt)}</div></div>
            <div><div className="text-xs text-muted-foreground">Tipo de contato</div><div className="font-medium">{client.contactType ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Próxima ação</div><div className="font-medium">{client.nextAction ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Data próxima ação</div><div className="font-medium">{formatDate(client.nextActionDate)}</div></div>
            <div><div className="text-xs text-muted-foreground">Conferência de datas</div><div className="font-medium">{formatDate(client.dateConference)}</div></div>
            <div><div className="text-xs text-muted-foreground">Próximo contato</div><div className="font-medium">{formatDate(nextContactDate(client.lastContactAt, client.contactFrequencyDays))} {isContactOverdue(client.lastContactAt, client.contactFrequencyDays) && <Badge variant="destructive" className="ml-2">Atrasado</Badge>}</div></div>
            <div><div className="text-xs text-muted-foreground">Último vídeo</div><div className="font-medium">{formatDate(client.lastVideoSentAt)}</div></div>
          </div>
        </CardContent>
      </Card>

      <ContactHistorySection clientId={id} histories={histories} />

      <Card>
        <CardHeader><CardTitle>Editar cliente</CardTitle></CardHeader>
        <CardContent><ClientForm client={client} vendors={vendors} /></CardContent>
      </Card>
    </div>
  );
}
