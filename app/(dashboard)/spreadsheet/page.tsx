import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpreadsheetToolbar } from "@/components/spreadsheet/spreadsheet-toolbar";
import { SHEET_LABELS } from "@/lib/spreadsheet";
import { FileSpreadsheet, Users, FileText, CalendarDays, LayoutDashboard, ListChecks, Megaphone } from "lucide-react";

export default async function SpreadsheetPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;

  const clientWhere = role === "admin" ? { deletedAt: null } : { deletedAt: null, OR: [{ userId }, { vendorId: userId }] };
  const contractWhere = role === "admin" ? { deletedAt: null } : { deletedAt: null, vendorId: userId };
  const eventWhere = role === "admin" ? {} : { userId };

  const [clients, contracts, events, prospects] = await Promise.all([
    prisma.client.count({ where: clientWhere }),
    prisma.contract.count({ where: contractWhere }),
    prisma.event.count({ where: eventWhere }),
    prisma.client.count({ where: { ...clientWhere, contractStatus: { not: "active" } } }),
  ]);

  const sheets = [
    { title: SHEET_LABELS.dashboard, description: "Resumo do dia, visitas e lembretes automáticos.", icon: LayoutDashboard, value: `${events} eventos` },
    { title: SHEET_LABELS.prospection, description: "Prospecção, retornos e histórico de contatos.", icon: Megaphone, value: `${prospects} em prospecção` },
    { title: SHEET_LABELS.clients, description: "Dados cadastrais completos dos clientes.", icon: Users, value: `${clients} clientes` },
    { title: SHEET_LABELS.contracts, description: "Contratos, veiculação, valores e alertas.", icon: FileText, value: `${contracts} contratos` },
    { title: SHEET_LABELS.calendar, description: "Agenda integrada de visitas, retornos e campanhas.", icon: CalendarDays, value: `${events} compromissos` },
    { title: SHEET_LABELS.lists, description: "Listas padronizadas de vendedores, mídias e status.", icon: ListChecks, value: "6 listas" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planilha de gestão"
        description="Importe o modelo completo da rádio e exporte todas as abas em um único arquivo Excel."
        actions={<SpreadsheetToolbar />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Modelo oficial — 6 abas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => {
            const Icon = sheet.icon;
            return (
              <div key={sheet.title} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{sheet.value}</span>
                </div>
                <div className="mt-3 text-sm font-semibold">{sheet.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{sheet.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Importar:</strong> selecione o arquivo .xlsx no modelo novo. O sistema lê as abas de cadastro, prospecção, contratos e calendário, cria ou atualiza clientes, contratos e eventos sem duplicar registros.</p>
          <p><strong className="text-foreground">Exportar:</strong> gera um único .xlsx com as 6 abas preenchidas com os dados atuais, incluindo datas de próximo retorno, dias restantes, status visual e alertas de renovação calculados automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
