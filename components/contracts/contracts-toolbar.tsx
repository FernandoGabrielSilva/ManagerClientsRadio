"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, WorkbookImportButton, ExportPdfButton } from "@/components/import-export";
import { getAllContractsForExportAction } from "@/app/actions/contracts";
import { startImportWorkbookJobAction } from "@/app/actions/spreadsheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContractForm } from "@/components/contracts/contract-form";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, FileText as FileTextIcon } from "lucide-react";
import { diffDays, formatDateBR, normalizeHeader, renewalAlert, toDate, visualContractStatus } from "@/lib/spreadsheet";

export function ContractsToolbar({ contracts, exportContracts, clients = [], view = "active" }: { contracts: Array<Record<string, unknown>>; exportContracts?: Array<Record<string, unknown>>; clients?: { id: string; name: string }[]; view?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportHeaders = [
    "Nº Contrato / PI",
    "Cliente / Anunciante",
    "Vendedor Responsável",
    "Programa / Faixa",
    "Data de Início",
    "Duração (Meses)",
    "Data de Término (Auto)",
    "Tipo de Mídia",
    "Qtd. Inserções / Dia",
    "Total Inserções / Mês",
    "Horários de Veiculação",
    "Dias Restantes",
    "Valor Mensal (R$)",
    "Valor Total / Valor Bruto",
    "Status Visual",
    "Alerta Renovação",
    "Pagamento / Vencimento",
    "Observações de Veiculação",
  ];

  async function getExportData() {
    setExporting(true);
    try {
      const source = exportContracts ?? await getAllContractsForExportAction();
      const str = (v: unknown) => (v == null ? "" : String(v));
      const scalar = (v: unknown): string | number | null | undefined => {
        if (v == null) return "";
        if (typeof v === "number" || typeof v === "string") return v;
        return String(v);
      };
      const exportRows: (string | number | null | undefined)[][] = [];
      const exportData: Record<string, unknown>[] = [];
      for (const raw of source) {
        const c = raw as Record<string, unknown>;
        const client = c.client as Record<string, unknown> | null | undefined;
        const vendor = c.vendor as Record<string, unknown> | null | undefined;
        const cancelled = normalizeHeader(`${str(c.number)} ${str(c.notes)}`).includes("cancel");
        const end = toDate(c.endDate as string | Date | null);
        const start = toDate(c.startDate as string | Date | null);
        const duration = scalar(c.durationMonths) || (start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (86400000 * 30))) : "");
        const row: (string | number | null | undefined)[] = [
          str(c.number ?? c["Nº Contrato / PI"] ?? "PI"),
          str(c.clientName ?? client?.name),
          str(c.sellerName ?? vendor?.name ?? c["Vendedor Responsável"]),
          str(c.program ?? c["Programa / Faixa"]),
          formatDateBR((c.startDate as string | Date | null) ?? null),
          duration,
          formatDateBR((c.endDate as string | Date | null) ?? null),
          str(c.mediaType ?? c["Tipo de Mídia"] ?? "Spot 30s"),
          scalar(c.insertionsPerDay ?? c["Qtd. Inserções / Dia"]),
          scalar(c.insertionsPerMonth ?? c.insertions ?? c["Total Inserções / Mês"]),
          str(c.timeSlots ?? c["Horários de Veiculação"]),
          diffDays(end) ?? "",
          scalar(c.value ?? c["Valor Mensal (R$)"]),
          scalar(c.totalValue ?? c["Valor Total / Valor Bruto"]),
          visualContractStatus(c.endDate as string | Date | null, cancelled),
          renewalAlert(c.endDate as string | Date | null, cancelled),
          str(c.paymentInfo ?? c["Pagamento / Vencimento"]),
          str(c.notes ?? c["Observações de Veiculação"]),
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
            <FileTextIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-sm text-muted-foreground">{contracts.length} contratos cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto">
          {[
            { key: "active", label: "Ativos" },
            { key: "archived", label: "Arquivados" },
          ].map((t) => (
            <Link key={t.key} href={`/contracts?view=${t.key}`} className={`flex-1 sm:flex-none text-center px-3 py-1.5 text-sm rounded-md ${view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {t.label}
            </Link>
          ))}
        </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <ExportButton
          styled
          filename="contratos.xlsx"
          sheetName="Controle de Contratos"
          title="BACABAL FM 90.1  |  CONTROLE DE CONTRATOS"
          subtitle="Contratos assinados e veiculação"
          headers={exportHeaders}
          getExportData={getExportData}
          columnWidths={[16, 30, 18, 26, 14, 12, 16, 24, 12, 14, 34, 12, 16, 18, 18, 18, 40, 50]}
          loading={exporting}
        />
        <ExportPdfButton getData={async () => (await getExportData()).exportData} filename="contratos.pdf" columns={exportHeaders.map((h) => ({ header: h, dataKey: h }))} loading={exporting} />
        <WorkbookImportButton onImport={handleImport} loading={importing} />
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo contrato</Button>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo contrato</DialogTitle></DialogHeader>
            <ContractForm clients={clients} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
