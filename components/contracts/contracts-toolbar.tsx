"use client";

import { useRouter } from "next/navigation";
import { ExportButton, ImportButton, ExportPdfButton } from "@/components/import-export";
import { importContractsAction } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, FileText as FileTextIcon } from "lucide-react";

export function ContractsToolbar({ contracts, view = "active" }: { contracts: any[]; view?: string }) {
  const router = useRouter();
  const exportData = contracts.map((c) => ({
    Número: c.number,
    Cliente: c.client?.name,
    Tipo: c.mediaType,
    Início: c.startDate,
    Término: c.endDate,
    Inserções: c.insertions,
    Horários: c.timeSlots,
    Valor: c.value,
    Status: c.status,
  }));

  async function handleImport(rows: any[]) {
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
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {[
            { key: "active", label: "Ativos" },
            { key: "archived", label: "Arquivados" },
          ].map((t) => (
            <Link key={t.key} href={`/contracts?view=${t.key}`} className={`px-3 py-1.5 text-sm rounded-md ${view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {t.label}
            </Link>
          ))}
        </div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportButton data={exportData} filename="contratos.xlsx" />
        <ExportPdfButton data={exportData} filename="contratos.pdf" columns={Object.keys(exportData[0] ?? {}).map((k) => ({ header: k, dataKey: k }))} />
        <ImportButton onImport={handleImport} />
        <Link href="/contracts/new"><Button><Plus className="h-4 w-4 mr-2" />Novo contrato</Button></Link>
      </div>
    </div>
  );
}
