"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, WorkbookImportButton, ExportPdfButton } from "@/components/import-export";
import { getAllClientsForExportAction } from "@/app/actions/clients";
import { startImportWorkbookJobAction } from "@/app/actions/spreadsheet";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/client-form";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { formatDateBR, toDate } from "@/lib/spreadsheet";

export function ClientsToolbar({ clients, exportClients, vendors, view = "active" }: { clients: Array<Record<string, unknown>>; exportClients?: Array<Record<string, unknown>>; vendors?: { id: string; name: string | null }[]; view?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportHeaders = [
    "Razão Social",
    "Nome Fantasia / Cliente",
    "CNPJ / CPF",
    "Endereço Completo",
    "Telefone / WhatsApp",
    "E-mail",
    "Contato Responsável",
    "Cargo / Setor",
    "Vendedor / Representante",
    "Data Último Contato",
    "Próxima Ação",
    "Prazo Retorno (Dias)",
    "Data Próximo Retorno (Auto)",
    "Situação Comercial",
    "Histórico de Contatos / Detalhes do PI",
  ];

  function nextReturn(c: Record<string, unknown>) {
    const explicit = toDate(c.nextActionDate);
    if (explicit) return formatDateBR(explicit);
    const last = toDate(c.lastContactAt);
    if (!last) return "";
    return formatDateBR(new Date(last.getTime() + (Number(c.contactFrequencyDays ?? 14) || 14) * 86400000));
  }

  async function getExportData() {
    setExporting(true);
    try {
      const source = exportClients ?? await getAllClientsForExportAction();
      const str = (v: unknown) => (v == null ? "" : String(v));
      const exportRows: (string | number | null | undefined)[][] = [];
      const exportData: Record<string, unknown>[] = [];
      for (const raw of source) {
        const c = raw as Record<string, unknown>;
        const row = [
          str(c.legalName ?? c.name),
          str(c.tradeName ?? c.name),
          str(c.cnpj),
          str(c.address),
          str(c.phone),
          str(c.email),
          str(c.contactName),
          str(c.contactRole),
          str(c.responsible),
          formatDateBR(c.lastContactAt as string | Date | null),
          str(c.nextAction),
          Number(c.contactFrequencyDays ?? 14) || 14,
          nextReturn(c),
          str(c.commercialStatus ?? c.contractStatus),
          str(c.notes),
        ];
        exportRows.push(row);
        const obj: Record<string, unknown> = {};
        exportHeaders.forEach((header, index) => { obj[header] = row[index]; });
        exportData.push(obj);
      }
      return { exportRows, exportData };
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(sheets: Record<string, unknown[][]>) {
    setImporting(true);
    try {
      await startImportWorkbookJobAction(sheets);
      toast.add({ title: "Importação iniciada", description: "Acompanhe o progresso no topo da página." });
      router.refresh();
    } catch (error) {
      toast.add({ title: "Erro na importação", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setImporting(false);
    }
  }

  return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto">
          {[
            { key: "active", label: "Ativos" },
            { key: "archived", label: "Arquivados" },
          ].map((t) => (
            <Link key={t.key} href={`/clients?view=${t.key}`} className={`flex-1 sm:flex-none text-center px-3 py-1.5 text-sm rounded-md ${view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {t.label}
            </Link>
          ))}
        </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

        <ExportButton
          styled
          filename="clientes.xlsx"
          sheetName="Cadastro de Clientes"
          title="BACABAL FM 90.1  |  CADASTRO DE CLIENTES"
          subtitle="Dados cadastrais e histórico comercial"
          headers={exportHeaders}
          getExportData={getExportData}
          columnWidths={[30, 28, 20, 38, 20, 26, 24, 20, 20, 14, 24, 12, 16, 24, 50]}
          loading={exporting}
        />
        <ExportPdfButton getData={async () => (await getExportData()).exportData} filename="clientes.pdf" columns={exportHeaders.map((h) => ({ header: h, dataKey: h }))} loading={exporting} />
        <WorkbookImportButton onImport={handleImport} loading={importing} />
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo cliente</Button>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
            <ClientForm vendors={vendors} onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
