"use client";

import { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { exportStyledXlsx } from "@/lib/export-excel";

type ExportButtonProps =
  | { data: any[]; filename: string; sheetName?: string }
  | {
      data: any[];
      filename: string;
      styled: true;
      sheetName: string;
      headers: string[];
      rows: (string | number | null | undefined)[][];
      columnWidths?: number[];
    };

export function ExportButton(props: ExportButtonProps) {
  function handle() {
    if ("styled" in props && props.styled) {
      exportStyledXlsx({
        filename: props.filename,
        sheetName: props.sheetName,
        headers: props.headers,
        rows: props.rows,
        columnWidths: props.columnWidths,
      });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(props.data);
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
    <Button variant="outline" onClick={handle} className="w-full sm:w-auto">
      <Download className="h-4 w-4 mr-2" /> Exportar Excel
    </Button>
  );
}

function filenameSafe(name: string) {
  return name || "export.xlsx";
}

export function ImportButton({ onImport }: { onImport: (rows: any[]) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    let headerIndex = raw.findIndex((r: any) => Array.isArray(r) && r.some((c: any) => {
      const v = String(c ?? "").toLowerCase();
      return v.includes("cliente") || v === "nome" || v === "name" || v.includes("anunciante");
    }));
    if (headerIndex === -1) headerIndex = 0;
    const headers = (raw[headerIndex] as any[]) || [];
    const dataRows = raw.slice(headerIndex + 1);
    const rows = dataRows
      .map((r: any) => {
        const obj: any = {};
        headers.forEach((h: any, i: number) => {
          if (h != null && String(h).trim() !== "") obj[String(h).trim()] = r?.[i] ?? null;
        });
        return JSON.parse(JSON.stringify(obj));
      })
      .filter((r: any) => Object.values(r).some((v: any) => v != null && String(v).trim() !== ""));
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

export function ExportPdfButton({ data, filename, columns }: { data: any[]; filename: string; columns: { header: string; dataKey: string }[] }) {
  function handle() {
    const doc = new jsPDF();
    autoTable(doc, { head: [columns.map((c) => c.header)], body: data.map((row) => columns.map((c) => row[c.dataKey] ?? "")) });
    doc.save(filename);
  }
  return (
    <Button variant="outline" onClick={handle} className="w-full sm:w-auto">
      <Download className="h-4 w-4 mr-2" /> Exportar PDF
    </Button>
  );
}
