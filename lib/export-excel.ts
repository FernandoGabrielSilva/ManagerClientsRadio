import * as XLSX from "xlsx-js-style";

type CellStyle = {
  font?: { bold?: boolean; italic?: boolean; underline?: boolean; color?: { rgb: string }; sz?: number; name?: string };
  fill?: { patternType?: "solid"; fgColor?: { rgb: string }; bgColor?: { rgb: string } };
  alignment?: { horizontal?: "left" | "center" | "right"; vertical?: "top" | "center" | "bottom"; wrapText?: boolean };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  numFmt?: string;
};

const COLORS = {
  navy: "1F4E78",
  subtitleBg: "D9E1F2",
  subtitleText: "1F4E78",
  grid: "D9D9D9",
  bodyText: "1F3A52",
  white: "FFFFFF",
};

const thinBorder = {
  top: { style: "thin", color: { rgb: COLORS.grid } },
  bottom: { style: "thin", color: { rgb: COLORS.grid } },
  left: { style: "thin", color: { rgb: COLORS.grid } },
  right: { style: "thin", color: { rgb: COLORS.grid } },
};

type StyledCell = Omit<XLSX.CellObject, "s" | "z"> & { s?: CellStyle; z?: string };

type WorkSheetWithView = XLSX.WorkSheet & {
  "!sheetView"?: { showGridLines: boolean };
  sheetView?: { showGridLines: boolean };
};

function setCell(ws: XLSX.WorkSheet, r: number, c: number, value: unknown, style: CellStyle) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = (ws[addr] as StyledCell | undefined) ?? ({ t: "s", v: "" } as StyledCell);
  if (value instanceof Date) {
    cell.t = "d";
    cell.v = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    cell.t = "n";
    cell.v = value;
  } else {
    const text = value == null ? "" : String(value);
    cell.t = "s";
    cell.v = text;
  }
  cell.s = style;
  if (style.numFmt) cell.z = style.numFmt;
  ws[addr] = cell;
}

function parseCurrency(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const date = new Date(year, Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function detectColumnFormat(header: string, values: unknown[]) {
  const h = header.toLowerCase();
  const isCurrency = h.includes("valor") || h.includes("(r$)") || h.includes("preço") || h.includes("preco");
  const isDate = h.includes("data") || h.includes("último contato") || h.includes("ultimo contato");
  if (isCurrency) {
    const parsed = values.map(parseCurrency);
    if (parsed.some((v) => v !== null)) return { kind: "currency" as const };
  }
  if (isDate) {
    const parsed = values.map(parseDate);
    if (parsed.some((v) => v !== null)) return { kind: "date" as const };
  }
  return { kind: "text" as const };
}

export type StyledSheetSpec = {
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[];
  title?: string;
  subtitle?: string;
};


function statusFill(header: string, value: unknown): { fill: CellStyle["fill"]; fontColor?: string } | null {
  const h = header.toLowerCase();
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  const isStatusCol = h.includes("status") || h.includes("alerta") || h.includes("prazo");
  if (!isStatusCol) return null;
  if (text.includes("vencido") || text.includes("cancel") || text.includes("atrasado")) {
    return { fill: { patternType: "solid", fgColor: { rgb: "FFC7CE" }, bgColor: { rgb: "FFC7CE" } }, fontColor: "9C0006" };
  }
  if (text.includes("perto") || text.includes("alerta") || text.includes("em ") || text.includes("hoje")) {
    return { fill: { patternType: "solid", fgColor: { rgb: "FFEB9C" }, bgColor: { rgb: "FFEB9C" } }, fontColor: "9C6500" };
  }
  if (text.includes("ativo") || text.includes("vigente") || text.includes("fechado") || text.includes("contrato")) {
    return { fill: { patternType: "solid", fgColor: { rgb: "C6EFCE" }, bgColor: { rgb: "C6EFCE" } }, fontColor: "006100" };
  }
  return null;
}

export function buildStyledSheet(opts: StyledSheetSpec): XLSX.WorkSheet {
  const { sheetName, headers, rows, columnWidths } = opts;
  const title = opts.title ?? sheetName;
  const subtitle = opts.subtitle ?? `${rows.length} registro${rows.length === 1 ? "" : "s"} • Gerado em ${new Date().toLocaleDateString("pt-BR")}`;

  const colCount = headers.length;
  const headerRow = 3;
  const dataStartRow = 4;
  const totalRows = dataStartRow + Math.max(rows.length, 1);

  const ws: XLSX.WorkSheet = {};
  const formats = headers.map((h, i) => detectColumnFormat(h, rows.map((r) => r[i])));

  for (let c = 0; c < colCount; c++) {
    setCell(ws, 0, c, c === 0 ? title : "", {
      font: { bold: true, color: { rgb: COLORS.white }, sz: 14, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.navy }, bgColor: { rgb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
    setCell(ws, 1, c, c === 0 ? subtitle : "", {
      font: { italic: true, color: { rgb: "404040" }, sz: 10, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.subtitleBg }, bgColor: { rgb: COLORS.subtitleBg } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
    setCell(ws, 2, c, "", {
      font: { sz: 10, name: "Calibri", color: { rgb: COLORS.bodyText } },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.white }, bgColor: { rgb: COLORS.white } },
      alignment: { vertical: "center" },
    });
    setCell(ws, headerRow, c, headers[c], {
      font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "2F75B5" }, bgColor: { rgb: "2F75B5" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder,
    });
  }

  const displayRows = rows.length > 0 ? rows : [headers.map(() => "")];
  displayRows.forEach((row, i) => {
    const r = dataStartRow + i;
    for (let c = 0; c < colCount; c++) {
      const raw = row[c];
      const fmt = formats[c];
      let value: unknown = raw == null ? "" : raw;
      const zebra = i % 2 === 1 ? "F2F7FB" : "FFFFFF";
      const align = fmt.kind === "text" ? "left" : "center";
      const style: CellStyle = {
        font: { sz: 10, name: "Calibri", color: { rgb: COLORS.bodyText } },
        fill: { patternType: "solid", fgColor: { rgb: zebra }, bgColor: { rgb: zebra } },
        alignment: { horizontal: align as "left" | "center" | "right", vertical: "center", wrapText: true },
        border: thinBorder,
      };
      if (fmt.kind === "currency") {
        const num = parseCurrency(raw);
        if (num !== null) {
          value = num;
          style.numFmt = '"R$" #,##0.00';
        }
      } else if (fmt.kind === "date") {
        const date = parseDate(raw);
        if (date) {
          value = date;
          style.numFmt = "dd/mm/yyyy";
        }
      }
      const headerLower2 = String(headers[c] ?? "").toLowerCase();
      if (headerLower2.includes("telefone") || headerLower2.includes("whatsapp") || headerLower2.includes("cnpj")) {
        value = value == null ? "" : String(value);
        style.numFmt = "@";
      }
      const sf = statusFill(headers[c], raw);
      if (sf) {
        style.fill = sf.fill;
        style.font = { ...(style.font ?? {}), color: { rgb: sf.fontColor ?? COLORS.bodyText }, bold: true };
      }
      setCell(ws, r, c, value, style);
      const addr2 = XLSX.utils.encode_cell({ r, c });
      const cellObj = ws[addr2] as StyledCell | undefined;
      const headerLower = String(headers[c] ?? "").toLowerCase();
      if (cellObj && value && (headerLower.includes("e-mail") || headerLower.includes("email") || headerLower.includes("site"))) {
        const url = headerLower.includes("site") ? String(value) : `mailto:${value}`;
        cellObj.l = { Target: url, Tooltip: String(value) };
        if (cellObj.s) cellObj.s.font = { ...(cellObj.s.font ?? {}), color: { rgb: "0563C1" }, underline: true };
      }
    }
  });

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows - 1, c: colCount - 1 } });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];
  ws["!cols"] = (columnWidths && columnWidths.length > 0
    ? columnWidths
    : headers.map((h) => Math.min(Math.max(String(h).length + 4, 14), 42))
  ).map((w) => ({ wch: w }));
  ws["!rows"] = [
    { hpt: 33.75 },
    { hpt: 21.75 },
    { hpt: 8 },
    { hpt: 27.75 },
  ];
  (ws as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = { xSplit: 0, ySplit: 4, topLeftCell: "A5", activePane: "bottomLeft", state: "frozen" };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow, c: colCount - 1 } }) };
  const sheetWithView = ws as WorkSheetWithView;
  sheetWithView["!sheetView"] = { showGridLines: false };
  sheetWithView.sheetView = { showGridLines: false };
  return ws;
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as XLSX.WritingOptions & { cellStyles?: boolean });
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStyledXlsx(opts: StyledSheetSpec & { filename: string }) {
  const ws = buildStyledSheet(opts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName);
  downloadWorkbook(wb, opts.filename);
}

export function exportStyledWorkbook(opts: { filename: string; sheets: StyledSheetSpec[] }) {
  const wb = XLSX.utils.book_new();
  for (const sheet of opts.sheets) {
    const ws = buildStyledSheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31));
  }
  downloadWorkbook(wb, opts.filename);
}
