"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkbookImportButton } from "@/components/import-export";
import { startImportWorkbookJobAction } from "@/app/actions/spreadsheet";
import { getWorkbookExportDataAction } from "@/app/actions/spreadsheet";
import { exportTemplateWorkbook } from "@/lib/export-template";
import { buildWorkbookSheets } from "@/lib/export-workbook";
import { exportStyledXlsx } from "@/lib/export-excel";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileSpreadsheet } from "lucide-react";

export function SpreadsheetToolbar() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [exportingDashboard, setExportingDashboard] = useState(false);
  const [exportingComplete, setExportingComplete] = useState(false);

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

  async function handleDashboardExport() {
    setExportingDashboard(true);
    try {
      const data = await getWorkbookExportDataAction();
      const sheets = buildWorkbookSheets(data);
      const dash = sheets[0];
      exportStyledXlsx({
        filename: "Dashboard e Lembretes.xlsx",
        sheetName: dash.sheetName,
        headers: dash.headers,
        rows: dash.rows,
        columnWidths: dash.columnWidths,
        title: dash.title,
        subtitle: dash.subtitle,
      });
    } finally {
      setExportingDashboard(false);
    }
  }

  async function handleCompleteExport() {
    setExportingComplete(true);
    try {
      const data = await getWorkbookExportDataAction();
      await exportTemplateWorkbook(data);
    } finally {
      setExportingComplete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WorkbookImportButton onImport={handleImport} loading={importing} />
      <Button variant="outline" onClick={handleDashboardExport} disabled={exportingDashboard} className="w-full sm:w-auto">
        <LayoutDashboard className="h-4 w-4 mr-2" /> {exportingDashboard ? "Gerando..." : "Exportar Dashboard & Lembretes"}
      </Button>
      <Button variant="outline" onClick={handleCompleteExport} disabled={exportingComplete} className="w-full sm:w-auto">
        <FileSpreadsheet className="h-4 w-4 mr-2" /> {exportingComplete ? "Gerando..." : "Exportar planilha completa"}
      </Button>
    </div>
  );
}
