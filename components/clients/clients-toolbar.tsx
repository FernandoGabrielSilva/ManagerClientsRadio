"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExportButton, ImportButton, ExportPdfButton } from "@/components/import-export";
import { importClientsAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/client-form";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export function ClientsToolbar({ clients, vendors, view = "active" }: { clients: any[]; vendors?: { id: string; name: string | null }[]; view?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const exportData = clients.map((c) => ({
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
      <div className="flex flex-wrap items-center gap-2">
        <ExportButton data={exportData} filename="clientes.xlsx" />
        <ExportPdfButton data={exportData} filename="clientes.pdf" columns={Object.keys(exportData[0] ?? {}).map((k) => ({ header: k, dataKey: k }))} />
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
