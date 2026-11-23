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
};

const BORDER = {
  top: { style: "thin", color: { rgb: "D9E2EC" } },
  bottom: { style: "thin", color: { rgb: "D9E2EC" } },
  left: { style: "thin", color: { rgb: "D9E2EC" } },
  right: { style: "thin", color: { rgb: "D9E2EC" } },
};

const HEADER_FILL = { patternType: "solid" as const, fgColor: { rgb: "7CA1C4" }, bgColor: { rgb: "7CA1C4" } };
const ZEBRA_FILL = { patternType: "solid" as const, fgColor: { rgb: "EDF5FB" }, bgColor: { rgb: "EDF5FB" } };
const WHITE_FILL = { patternType: "solid" as const, fgColor: { rgb: "FFFFFF" }, bgColor: { rgb: "FFFFFF" } };

export function exportStyledXlsx(opts: {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[]; // in excel units (approx)
}) {
  const { filename, sheetName, headers, rows, columnWidths } = opts;

  const aoa: (string | number | null)[][] = [headers, ...rows.map((r) => r.map((v) => (v === undefined || v === null ? "" : v)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  // styles
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;

      const isHeader = r === 0;
      const isZebra = !isHeader && r % 2 === 1; // 1-based data row 1 => r===1 => zebra
      const style: CellStyle = {
        border: BORDER,
        alignment: { vertical: "center", wrapText: isHeader ? true : false },
      };

      if (isHeader) {
        style.font = { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" };
        style.fill = HEADER_FILL;
        style.alignment = { horizontal: "left", vertical: "center", wrapText: true };
      } else {
        style.font = { sz: 10, name: "Calibri", color: { rgb: "1F2937" } };
        style.fill = isZebra ? ZEBRA_FILL : WHITE_FILL;
        style.alignment = { horizontal: "left", vertical: "center", wrapText: true };
      }

      cell.s = style as any;
    }
  }

  // column widths
  if (columnWidths && columnWidths.length > 0) {
    ws["!cols"] = columnWidths.map((w) => ({ wch: w }));
  } else {
    ws["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(String(h).length + 2, 12), 40) }));
  }

  // row heights: header a bit taller
  ws["!rows"] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 20 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as any);
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
