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

export function ClientsToolbar({ clients, exportClients, vendors, view = "active" }: { clients: Array<Record<string, unknown>>; exportClients?: Array<Record<string, unknown>>; vendors?: { id: string; name: string | null }[]; view?: string }) {
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
      const fmtDate = (v: unknown) => {
        if (!v) return "";
        if (v instanceof Date) return v.toLocaleDateString("pt-BR");
        if (typeof v === "string" || typeof v === "number") return new Date(v).toLocaleDateString("pt-BR");
        return "";
      };
      const str = (v: unknown) => (v == null ? "" : String(v));
      const exportRows: (string | number | null | undefined)[][] = source.map((raw) => {
        const c = raw as Record<string, unknown>;
        return [
          str(c.name),
          str(c.responsible),
          str(c.contactName),
          str(c.phone),
          str(c.commercialStatus ?? c.contractStatus),
          c.contractValue as string | number | null | undefined ?? "",
          fmtDate(c.lastContactAt),
          str(c.contactType),
          str(c.nextAction),
          fmtDate(c.nextActionDate),
          str(c.notes),
          fmtDate(c.dateConference),
          str(c.videoWeekday),
        ];
      });
      const exportData: Record<string, unknown>[] = source.map((raw) => {
        const c = raw as Record<string, unknown>;
        return {
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
        };
      });
      return { exportRows, exportData };
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(rows: Record<string, unknown>[]) {
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
          title="BACABAL FM 90.1  |  CLIENTES"
          subtitle="Base de clientes e prospecção"
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
