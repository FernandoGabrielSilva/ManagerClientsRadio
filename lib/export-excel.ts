import * as XLSX from "xlsx";

type CellStyle = {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number; name?: string };
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
  navy: "18334E",
  subtitleBg: "EAF1F7",
  subtitleText: "526477",
  grid: "D7E3EE",
  bodyText: "1F2937",
  white: "FFFFFF",
};

const thinBorder = {
  top: { style: "thin", color: { rgb: COLORS.grid } },
  bottom: { style: "thin", color: { rgb: COLORS.grid } },
  left: { style: "thin", color: { rgb: COLORS.grid } },
  right: { style: "thin", color: { rgb: COLORS.grid } },
};

type StyledCell = XLSX.CellObject & { s?: CellStyle; z?: string };

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

export function exportStyledXlsx(opts: {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[];
  title?: string;
  subtitle?: string;
}) {
  const { filename, sheetName, headers, rows, columnWidths } = opts;
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
      font: { bold: true, color: { rgb: COLORS.white }, sz: 16, name: "Carlito" },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.navy }, bgColor: { rgb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
    setCell(ws, 1, c, c === 0 ? subtitle : "", {
      font: { bold: false, color: { rgb: COLORS.subtitleText }, sz: 10, name: "Carlito" },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.subtitleBg }, bgColor: { rgb: COLORS.subtitleBg } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
    setCell(ws, 2, c, "", {
      font: { sz: 11, name: "Carlito", color: { rgb: COLORS.bodyText } },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.white }, bgColor: { rgb: COLORS.white } },
      alignment: { vertical: "center" },
    });
    setCell(ws, headerRow, c, headers[c], {
      font: { bold: true, color: { rgb: COLORS.white }, sz: 11, name: "Carlito" },
      fill: { patternType: "solid", fgColor: { rgb: COLORS.navy }, bgColor: { rgb: COLORS.navy } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
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
      const style: CellStyle = {
        font: { sz: 11, name: "Carlito", color: { rgb: COLORS.bodyText } },
        fill: { patternType: "solid", fgColor: { rgb: COLORS.white }, bgColor: { rgb: COLORS.white } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
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
      setCell(ws, r, c, value, style);
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
    { hpt: 34 },
    { hpt: 24 },
    { hpt: 8 },
    { hpt: 30 },
    ...Array.from({ length: Math.max(displayRows.length, 1) }, () => ({ hpt: 24 })),
  ];
  (ws as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = { xSplit: 0, ySplit: 4, topLeftCell: "A5", activePane: "bottomLeft", state: "frozen" };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow, c: colCount - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as XLSX.WritingOptions & { cellStyles?: boolean });
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
