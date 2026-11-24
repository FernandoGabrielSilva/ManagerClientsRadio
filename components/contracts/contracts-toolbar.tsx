"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, ImportButton, ExportPdfButton } from "@/components/import-export";
import { getAllContractsForExportAction } from "@/app/actions/contracts";
import { startImportContractsJobAction } from "@/app/actions/background-jobs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContractForm } from "@/components/contracts/contract-form";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, FileText as FileTextIcon } from "lucide-react";

export function ContractsToolbar({ contracts, exportContracts, clients = [], view = "active" }: { contracts: Array<Record<string, unknown>>; exportContracts?: Array<Record<string, unknown>>; clients?: { id: string; name: string }[]; view?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportHeaders = [
    "Número",
    "Cliente",
    "Vendedor",
    "Tipo",
    "Início",
    "Término",
    "Inserções",
    "Horários",
    "Valor",
    "Status",
  ];

  async function getExportData() {
    setExporting(true);
    try {
      const source = exportContracts ?? await getAllContractsForExportAction();
      const fmtDate = (v: unknown) => {
        if (!v) return "";
        if (v instanceof Date) return v.toLocaleDateString("pt-BR");
        if (typeof v === "string" || typeof v === "number") return new Date(v).toLocaleDateString("pt-BR");
        return "";
      };
      const str = (v: unknown) => (v == null ? "" : String(v));
      const exportRows: (string | number | null | undefined)[][] = source.map((raw) => {
        const c = raw as Record<string, unknown>;
        const client = c.client as Record<string, unknown> | null | undefined;
        const vendor = c.vendor as Record<string, unknown> | null | undefined;
        const seller = str(c.sellerName ?? vendor?.name ?? c.seller);
        return [
          str(c.number),
          str(client?.name ?? c.clientName),
          seller,
          str(c.mediaType),
          fmtDate(c.startDate),
          fmtDate(c.endDate),
          c.insertions as string | number | null | undefined ?? "",
          str(c.timeSlots),
          c.value as string | number | null | undefined ?? "",
          str(c.status),
        ];
      });
      const exportData: Record<string, unknown>[] = source.map((raw) => {
        const c = raw as Record<string, unknown>;
        const client = c.client as Record<string, unknown> | null | undefined;
        const vendor = c.vendor as Record<string, unknown> | null | undefined;
        return {
          "Número": c.number,
          "Cliente": client?.name ?? c.clientName,
          "Vendedor": c.sellerName ?? vendor?.name ?? c.seller,
          "Tipo": c.mediaType,
          "Início": c.startDate,
          "Término": c.endDate,
          "Inserções": c.insertions,
          "Horários": c.timeSlots,
          "Valor": c.value,
          "Status": c.status,
        };
      });
      return { exportRows, exportData };
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(rows: Record<string, unknown>[]) {
    await startImportContractsJobAction(rows);
    toast.add({ title: "Importação iniciada", description: "Acompanhe o progresso no canto inferior." });
    router.refresh();
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
          sheetName="Contratos"
          title="BACABAL FM 90.1  |  CONTRATOS"
          subtitle="Controle de contratos"
          headers={exportHeaders}
          getExportData={getExportData}
          columnWidths={[18, 24, 20, 16, 14, 14, 12, 24, 14, 16]}
          loading={exporting}
        />
        <ExportPdfButton getData={async () => (await getExportData()).exportData} filename="contratos.pdf" columns={exportHeaders.map((h) => ({ header: h, dataKey: h }))} loading={exporting} />
        <ImportButton onImport={handleImport} />
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
