import * as XLSX from "xlsx-js-style";
import type { WorkbookData } from "./export-workbook";

type TemplateCell = {
  f?: string;
  t?: XLSX.ExcelDataType | "str";
  v?: string | number | boolean | Date;
  z?: string;
};

type WorkBookWithCalcPr = XLSX.WorkBook & { calcPr?: { fullCalcOnLoad: boolean } };

type TemplateWriteOptions = XLSX.WritingOptions & { cellStyles?: boolean };

function serial(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000 + 25569;
}

function put(ws: XLSX.WorkSheet, r: number, c: number, value: unknown, formula?: string) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const existing = (ws[addr] as TemplateCell | undefined) ?? {};
  const cell: TemplateCell = { ...existing };
  if (formula) {
    cell.f = formula;
    cell.t = "str";
  } else if (value instanceof Date) {
    cell.t = "d";
    cell.v = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    cell.t = "n";
    cell.v = value;
  } else if (value == null || value === "") {
    cell.t = "s";
    cell.v = "";
  } else {
    cell.t = "s";
    cell.v = String(value);
  }
  ws[addr] = cell;
}

function clearRange(ws: XLSX.WorkSheet, startRow: number, endRow: number, cols: number) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < cols; c++) {
      put(ws, r, c, "");
    }
  }
}

export async function exportTemplateWorkbook(data: WorkbookData) {
  const response = await fetch("/modelo.xlsx");
  const buffer = await response.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const today = new Date();
  const todaySerial = today.getTime() / 86400000 + 25569;

  // --- PROSPECÇÃO E VISITAS (row index 4 = row 5) ---
  const prospection = wb.Sheets["PROSPECÇÃO E VISITAS"];
  const prospectionStart = 4;
  const prospectionEnd = 199;
  clearRange(prospection, prospectionStart, prospectionEnd, 15);

  let prospectionRow = prospectionStart;
  const todayRows: number[] = [];
  for (const client of data.clients) {
    const r = prospectionRow;
    const nextDateSerial = serial(client.nextActionDate ?? null);
    const isToday = client.nextActionDate ? Math.floor(nextDateSerial as number) === Math.floor(todaySerial) : false;
    if (isToday) todayRows.push(r + 1); // 1-indexed
    put(prospection, r, 0, client.name);
    put(prospection, r, 1, client.responsible ?? "");
    put(prospection, r, 2, client.contactName ?? "");
    put(prospection, r, 3, client.phone ?? "");
    put(prospection, r, 4, client.commercialStatus ?? "");
    put(prospection, r, 5, client.contractValue ?? "");
    put(prospection, r, 6, client.offeredMediaType ?? "");
    const lastSerial = serial(client.lastContactAt ?? null);
    if (lastSerial != null) put(prospection, r, 7, ""); // placeholder
    // dates as serial numbers to preserve format
    if (lastSerial != null) {
      const cell = prospection[XLSX.utils.encode_cell({ r, c: 7 })] as TemplateCell;
      cell.t = "n"; cell.v = lastSerial; cell.z = "dd/mm/yyyy";
    }
    put(prospection, r, 8, client.contactType ?? "");
    put(prospection, r, 9, client.nextAction ?? "");
    put(prospection, r, 10, client.contactFrequencyDays ?? 14);
    if (nextDateSerial != null) {
      const cell = prospection[XLSX.utils.encode_cell({ r, c: 11 })] as TemplateCell;
      cell.t = "n"; cell.v = nextDateSerial; cell.z = "dd/mm/yyyy";
    }
    put(prospection, r, 13, client.notes ?? "");
    prospectionRow++;
    if (prospectionRow > prospectionEnd) break;
  }

  // --- CADASTRO DE CLIENTES ---
  const clients = wb.Sheets["CADASTRO DE CLIENTES"];
  const clientsStart = 4;
  const clientsEnd = 199;
  clearRange(clients, clientsStart, clientsEnd, 15);
  let clientRow = clientsStart;
  for (const client of data.clients) {
    const r = clientRow;
    put(clients, r, 0, client.legalName ?? client.name);
    put(clients, r, 1, client.tradeName ?? client.name);
    put(clients, r, 2, client.cnpj ?? "");
    put(clients, r, 3, client.address ?? "");
    put(clients, r, 4, client.phone ?? "");
    put(clients, r, 5, client.email ?? "");
    put(clients, r, 6, client.contactName ?? "");
    put(clients, r, 7, client.contactRole ?? "");
    put(clients, r, 8, client.responsible ?? "");
    const lastSerial = serial(client.lastContactAt ?? null);
    if (lastSerial != null) {
      const cell = clients[XLSX.utils.encode_cell({ r, c: 9 })] as TemplateCell;
      cell.t = "n"; cell.v = lastSerial; cell.z = "dd/mm/yyyy";
    }
    put(clients, r, 10, client.nextAction ?? "");
    put(clients, r, 11, client.contactFrequencyDays ?? 14);
    put(clients, r, 13, client.commercialStatus ?? client.contractStatus ?? "");
    put(clients, r, 14, client.notes ?? "");
    clientRow++;
    if (clientRow > clientsEnd) break;
  }

  // --- CONTROLE DE CONTRATOS ---
  const contracts = wb.Sheets["CONTROLE DE CONTRATOS"];
  const contractsStart = 4;
  const contractsEnd = 199;
  clearRange(contracts, contractsStart, contractsEnd, 18);
  let contractRow = contractsStart;
  for (const contract of data.contracts) {
    const r = contractRow;
    put(contracts, r, 0, contract.number ?? "PI");
    put(contracts, r, 1, contract.clientName);
    put(contracts, r, 2, contract.sellerName ?? "");
    put(contracts, r, 3, contract.program ?? "");
    const startSerial = serial(contract.startDate ?? null);
    if (startSerial != null) {
      const cell = contracts[XLSX.utils.encode_cell({ r, c: 4 })] as TemplateCell;
      cell.t = "n"; cell.v = startSerial; cell.z = "dd/mm/yyyy";
    }
    put(contracts, r, 5, contract.durationMonths ?? "");
    // G: Data de Término (Auto) formula
    const gAddr = XLSX.utils.encode_cell({ r, c: 6 });
    const gCell: TemplateCell = (contracts[gAddr] as TemplateCell | undefined) ?? {};
    gCell.f = `IF(AND(E${r + 1}<>\"\",F${r + 1}<>\"\"),EDATE(E${r + 1},F${r + 1}),\"\")`;
    gCell.t = "n";
    const endSerial = serial(contract.endDate ?? null);
    if (endSerial != null) gCell.v = endSerial;
    gCell.z = "dd/mm/yyyy";
    contracts[gAddr] = gCell;
    put(contracts, r, 7, contract.mediaType ?? "Spot 30s");
    put(contracts, r, 8, contract.insertionsPerDay ?? "");
    put(contracts, r, 9, contract.insertionsPerMonth ?? "");
    put(contracts, r, 10, contract.timeSlots ?? "");
    // L: Dias Restantes formula
    const lAddr = XLSX.utils.encode_cell({ r, c: 11 });
    const lCell: TemplateCell = (contracts[lAddr] as TemplateCell | undefined) ?? {};
    lCell.f = `IF(G${r + 1}=\"\",\"\",G${r + 1}-'DASHBOARD & LEMBRETES'!$B$4)`;
    lCell.t = "n";
    const days = contract.endDate ? Math.round((new Date(contract.endDate).getTime() - Date.now()) / 86400000) : "";
    if (typeof days === "number") lCell.v = days;
    contracts[lAddr] = lCell;
    put(contracts, r, 12, contract.value ?? "");
    put(contracts, r, 13, contract.totalValue ?? "");
    // O: Status Visual formula
    const oAddr = XLSX.utils.encode_cell({ r, c: 14 });
    const oCell: TemplateCell = (contracts[oAddr] as TemplateCell | undefined) ?? {};
    oCell.f = `IF(L${r + 1}=\"\",\"\",IF(L${r + 1}<0,\"Vencido\",IF(L${r + 1}<=30,\"Perto de Vencer\",\"Ativo\")))`;
    oCell.t = "str";
    oCell.v = contract.status === "expired" ? "Vencido" : contract.status === "near_expiry" ? "Perto de Vencer" : "Ativo";
    contracts[oAddr] = oCell;
    // P: Alerta Renovação formula
    const pAddr = XLSX.utils.encode_cell({ r, c: 15 });
    const pCell: TemplateCell = (contracts[pAddr] as TemplateCell | undefined) ?? {};
    pCell.f = `IF(L${r + 1}=\"\",\"\",IF(L${r + 1}<0,\"VENCIDO\",IF(L${r + 1}<=5,\"ALERTA 5 DIAS\",IF(L${r + 1}<=15,\"ALERTA 15 DIAS\",IF(L${r + 1}<=30,\"ALERTA 30 DIAS\",\"Vigente (>30d)\")))))`;
    pCell.t = "str";
    contracts[pAddr] = pCell;
    put(contracts, r, 16, contract.paymentInfo ?? "");
    put(contracts, r, 17, contract.notes ?? "");
    contractRow++;
    if (contractRow > contractsEnd) break;
  }

  // --- CALENDÁRIO DE VISITAS ---
  const calendar = wb.Sheets["CALENDÁRIO DE VISITAS"];
  const calendarStart = 4;
  const calendarEnd = 199;
  clearRange(calendar, calendarStart, calendarEnd, 10);
  let calRow = calendarStart;
  for (const event of data.events) {
    const r = calRow;
    const dateSerial = serial(event.start);
    if (dateSerial != null) {
      const cell = calendar[XLSX.utils.encode_cell({ r, c: 0 })] as TemplateCell;
      cell.t = "n"; cell.v = dateSerial; cell.z = "dd/mm/yyyy";
    }
    // B: Dia da Semana formula
    const bAddr = XLSX.utils.encode_cell({ r, c: 1 });
    const bCell: TemplateCell = (calendar[bAddr] as TemplateCell | undefined) ?? {};
    bCell.f = `IF(A${r + 1}=\"\",\"\",TEXT(A${r + 1},\"dddd\"))`;
    bCell.t = "str";
    calendar[bAddr] = bCell;
    // C: Semana / Mês formula
    const cAddr = XLSX.utils.encode_cell({ r, c: 2 });
    const cCell: TemplateCell = (calendar[cAddr] as TemplateCell | undefined) ?? {};
    cCell.f = `IF(A${r + 1}=\"\",\"\",\"Sem \" & ISOWEEKNUM(A${r + 1}) & \" - \" & PROPER(TEXT(A${r + 1},\"mmmm/yy\")))`;
    cCell.t = "str";
    calendar[cAddr] = cCell;
    // D: Status Prazo formula
    const dAddr = XLSX.utils.encode_cell({ r, c: 3 });
    const dCell: TemplateCell = (calendar[dAddr] as TemplateCell | undefined) ?? {};
    dCell.f = `IF(A${r + 1}=\"\",\"\",IF(A${r + 1}<'DASHBOARD & LEMBRETES'!$B$4,\"Atrasado\",IF(A${r + 1}='DASHBOARD & LEMBRETES'!$B$4,\"HOJE\",\"Agendado\")))`;
    dCell.t = "str";
    calendar[dAddr] = dCell;
    put(calendar, r, 4, event.type === "contact" ? "Visita Comercial" : event.type === "contract_expiry" ? "Vencimento de Contrato" : event.type === "video" ? "Envio de Vídeo" : "Compromisso");
    put(calendar, r, 5, event.clientName ?? "");
    // parse description for responsible/contact/status/history
    const desc = event.description ?? "";
    const lines = desc.split(/\r?\n/);
    let responsible = "", contact = "", commercial = "", history = "";
    const hist: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      const low = t.toLowerCase();
      if (low.startsWith("responsável:")) responsible = t.split(":").slice(1).join(":").trim();
      else if (low.startsWith("contato:")) contact = t.split(":").slice(1).join(":").trim();
      else if (low.startsWith("situação:")) commercial = t.split(":").slice(1).join(":").trim();
      else hist.push(t);
    }
    history = hist.join("\n");
    put(calendar, r, 6, responsible);
    put(calendar, r, 7, contact);
    put(calendar, r, 8, commercial);
    put(calendar, r, 9, history);
    calRow++;
    if (calRow > calendarEnd) break;
  }

  (wb as WorkBookWithCalcPr).calcPr = { fullCalcOnLoad: true };
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as TemplateWriteOptions);
  if (typeof document !== "undefined") {
    const blob = new Blob([out], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Planilha completa.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } else {
    console.log("export generated", out.byteLength);
  }
}
