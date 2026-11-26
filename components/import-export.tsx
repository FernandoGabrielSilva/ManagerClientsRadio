"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { exportStyledXlsx, exportStyledWorkbook } from "@/lib/export-excel";
import { buildWorkbookSheets } from "@/lib/export-workbook";
import { getWorkbookExportDataAction } from "@/app/actions/spreadsheet";

type StyledExportProps = {
  data?: Record<string, unknown>[];
  getExportData?: () => Promise<{ exportRows: (string | number | null | undefined)[][]; exportData?: Record<string, unknown>[] }>;
  filename: string;
  styled: true;
  sheetName: string;
  headers: string[];
  rows?: (string | number | null | undefined)[][];
  columnWidths?: number[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
};
type PlainExportProps = { data?: Record<string, unknown>[]; getData?: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[]; filename: string; sheetName?: string; loading?: boolean };
type ExportButtonProps = PlainExportProps | StyledExportProps;

export function ExportButton(props: ExportButtonProps) {
  async function handle() {
    if ("styled" in props) {
      const resolved = props.getExportData ? await props.getExportData() : { exportRows: props.rows ?? [] };
      exportStyledXlsx({
        filename: props.filename,
        sheetName: props.sheetName,
        headers: props.headers,
        rows: resolved.exportRows,
        columnWidths: props.columnWidths,
        title: props.title,
        subtitle: props.subtitle,
      });
      return;
    }
    const data = props.getData ? await props.getData() : (props.data ?? []);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameSafe(props.filename);
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="outline" onClick={handle} disabled={props.loading} className="w-full sm:w-auto">
      <Download className="h-4 w-4 mr-2" /> {props.loading ? "Exportando..." : "Exportar Excel"}
    </Button>
  );
}

function filenameSafe(name: string) {
  return name || "export.xlsx";
}

export function ImportButton({ onImport }: { onImport: (rows: Record<string, unknown>[]) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    let headerIndex = raw.findIndex((r: unknown) => Array.isArray(r) && r.some((c: unknown) => {
      const v = String(c ?? "").toLowerCase();
      return v.includes("cliente") || v === "nome" || v === "name" || v.includes("anunciante");
    }));
    if (headerIndex === -1) headerIndex = 0;
    const headers = (raw[headerIndex] as unknown[]) || [];
    const dataRows = raw.slice(headerIndex + 1);
    const rows = dataRows
      .map((r: unknown) => {
        const obj: Record<string, unknown> = {};
        const row = Array.isArray(r) ? r : [];
        headers.forEach((h: unknown, i: number) => {
          if (h != null && String(h).trim() !== "") obj[String(h).trim()] = row[i] ?? null;
        });
        return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
      })
      .filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ""));
    await onImport(rows);
    if (ref.current) ref.current.value = "";
  }
  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
      <Button variant="outline" onClick={() => ref.current?.click()} className="w-full sm:w-auto">
        <Upload className="h-4 w-4 mr-2" /> Importar Excel
      </Button>
    </>
  );
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function ExportPdfButton({ data, getData, filename, columns, loading }: { data?: Record<string, unknown>[]; getData?: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[]; filename: string; columns: { header: string; dataKey: string }[]; loading?: boolean }) {
  async function handle() {
    const rows = getData ? await getData() : (data ?? []);
    const doc = new jsPDF();
    autoTable(doc, { head: [columns.map((c) => c.header)], body: rows.map((row) => columns.map((c) => row[c.dataKey] ?? "")) });
    doc.save(filename);
  }
  return (
    <Button variant="outline" onClick={handle} disabled={loading} className="w-full sm:w-auto">
      <Download className="h-4 w-4 mr-2" /> {loading ? "Exportando..." : "Exportar PDF"}
    </Button>
  );
}

export function WorkbookImportButton({
  onImport,
  loading,
  label = "Importar planilha completa",
}: {
  onImport: (sheets: Record<string, unknown[][]>) => Promise<void>;
  loading?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheets: Record<string, unknown[][]> = {};
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
      sheets[name] = JSON.parse(JSON.stringify(rows)) as unknown[][];
    }
    await onImport(sheets);
    if (ref.current) ref.current.value = "";
  }

  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={loading} className="w-full sm:w-auto">
        <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading ? "Importando..." : label}
      </Button>
    </>
  );
}

export function ExportWorkbookButton({
  filename = "Bacabal FM 90.1 - Gestão Comercial.xlsx",
  label = "Exportar planilha completa",
  className,
}: {
  filename?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const data = await getWorkbookExportDataAction();
      const sheets = buildWorkbookSheets(data);
      exportStyledWorkbook({ filename, sheets });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={handle} disabled={busy} className={className ?? "w-full sm:w-auto"}>
      <Download className="h-4 w-4 mr-2" /> {busy ? "Gerando..." : label}
    </Button>
  );
}
