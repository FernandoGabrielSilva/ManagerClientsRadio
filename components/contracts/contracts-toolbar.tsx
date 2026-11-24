"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, ImportButton, ExportPdfButton } from "@/components/import-export";
import { importContractsAction, getAllContractsForExportAction } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, FileText as FileTextIcon } from "lucide-react";

export function ContractsToolbar({ contracts, exportContracts, view = "active" }: { contracts: Array<Record<string, unknown>>; exportContracts?: Array<Record<string, unknown>>; view?: string }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const exportHeaders = [
    "Número",
    "Cliente",
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
      const exportRows = source.map((c: Record<string, unknown>) => [
        c.number ?? "",
        c.client?.name ?? c.clientName ?? "",
        c.mediaType ?? "",
        c.startDate ? new Date(c.startDate).toLocaleDateString("pt-BR") : "",
        c.endDate ? new Date(c.endDate).toLocaleDateString("pt-BR") : "",
        c.insertions ?? "",
        c.timeSlots ?? "",
        c.value ?? "",
        c.status ?? "",
      ]);
      const exportData = source.map((c: Record<string, unknown>) => ({
        "Número": c.number,
        "Cliente": c.client?.name ?? c.clientName,
        "Tipo": c.mediaType,
        "Início": c.startDate,
        "Término": c.endDate,
        "Inserções": c.insertions,
        "Horários": c.timeSlots,
        "Valor": c.value,
        "Status": c.status,
      }));
      return { exportRows, exportData };
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(rows: Record<string, unknown>[]) {
    const res = await importContractsAction(rows);
    toast.add({ title: "Importação", description: `Importados ${res?.count ?? 0} contratos` });
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
          columnWidths={[18, 28, 18, 14, 14, 12, 24, 14, 16]}
          loading={exporting}
        />
        <ExportPdfButton getData={async () => (await getExportData()).exportData} filename="contratos.pdf" columns={exportHeaders.map((h) => ({ header: h, dataKey: h }))} loading={exporting} />
        <ImportButton onImport={handleImport} />
        <Link href="/contracts/new" className="w-full sm:w-auto"><Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo contrato</Button></Link>
      </div>
    </div>
  );
}
