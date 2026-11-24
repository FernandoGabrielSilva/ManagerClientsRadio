"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, ImportButton, ExportPdfButton } from "@/components/import-export";
import { importClientsAction, getAllClientsForExportAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/client-form";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export function ClientsToolbar({ clients, exportClients, vendors, view = "active" }: { clients: any[]; exportClients?: any[]; vendors?: { id: string; name: string | null }[]; view?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportHeaders = [
    "Cliente / anunciante",
    "Responsável",
    "Contato / decisor",
    "WhatsApp",
    "Situação comercial",
    "Valor proposto (R$)",
    "Último contato",
    "Tipo de contato",
    "Próxima ação",
    "Data próxima ação",
    "Histórico / observações",
    "Conferência de datas",
    "Dias Vídeo",
  ];

  async function getExportData() {
    setExporting(true);
    try {
      const source = exportClients ?? await getAllClientsForExportAction();
      const exportRows = source.map((c: any) => [
        c.name ?? "",
        c.responsible ?? "",
        c.contactName ?? "",
        c.phone ?? "",
        c.commercialStatus ?? c.contractStatus ?? "",
        c.contractValue ?? "",
        c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString("pt-BR") : "",
        c.contactType ?? "",
        c.nextAction ?? "",
        c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString("pt-BR") : "",
        c.notes ?? "",
        c.dateConference ? new Date(c.dateConference).toLocaleDateString("pt-BR") : (c.dateConference ?? ""),
        c.videoWeekday ?? "",
      ]);
      const exportData = source.map((c: any) => ({
        "Cliente / anunciante": c.name,
        "Responsável": c.responsible,
        "Contato / decisor": c.contactName,
        "WhatsApp": c.phone,
        "Situação comercial": c.commercialStatus ?? c.contractStatus,
        "Valor proposto (R$)": c.contractValue,
        "Último contato": c.lastContactAt,
        "Tipo de contato": c.contactType,
        "Próxima ação": c.nextAction,
        "Data próxima ação": c.nextActionDate,
        "Histórico / observações": c.notes,
        "Conferência de datas": c.dateConference,
        "Dias Vídeo": c.videoWeekday,
      }));
      return { exportRows, exportData };
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(rows: any[]) {
    const res = await importClientsAction(rows);
    toast.add({ title: "Importação", description: `Importados ${res?.count ?? 0} clientes` });
    router.refresh();
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
          sheetName="Clientes"
          headers={exportHeaders}
          getExportData={getExportData}
          columnWidths={[28, 22, 22, 18, 22, 14, 14, 16, 22, 16, 50, 18, 14]}
          loading={exporting}
        />
        <ExportPdfButton getData={async () => (await getExportData()).exportData} filename="clientes.pdf" columns={exportHeaders.map((h) => ({ header: h, dataKey: h }))} loading={exporting} />
        <ImportButton onImport={handleImport} />
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
