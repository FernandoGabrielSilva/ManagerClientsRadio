import type { StyledSheetSpec } from "@/lib/export-excel";
import { weekdayLabel } from "@/lib/date-utils";
import {
  CALENDAR_HEADERS,
  CLIENT_HEADERS,
  CONTRACT_HEADERS,
  LIST_HEADERS,
  OPTION_LISTS,
  PROSPECTION_HEADERS,
  SHEET_LABELS,
  deadlineStatus,
  diffDays,
  formatDateBR,
  normalizeHeader,
  renewalAlert,
  toDate,
  todayUtc,
  videoFrequencyFromValue,
  visualContractStatus,
  weekdayName,
  weekOfMonthLabel,
} from "@/lib/spreadsheet";

type ClientLike = {
  name: string;
  legalName?: string | null;
  tradeName?: string | null;
  cnpj?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  responsible?: string | null;
  offeredMediaType?: string | null;
  videoFrequency?: string | null;
  videoWeekday?: number | null;
  lastContactAt?: string | null;
  nextAction?: string | null;
  contactFrequencyDays?: number | null;
  nextActionDate?: string | null;
  commercialStatus?: string | null;
  contactType?: string | null;
  contractValue?: number | null;
  notes?: string | null;
  contractStatus?: string | null;
};

function clientVideoFrequency(client: ClientLike): "weekly" | "monthly" {
  return videoFrequencyFromValue(client.videoFrequency);
}

type ContractLike = {
  number?: string | null;
  clientName: string;
  sellerName?: string | null;
  program?: string | null;
  startDate?: string | null;
  durationMonths?: number | null;
  endDate?: string | null;
  mediaType?: string | null;
  insertionsPerDay?: number | null;
  insertionsPerMonth?: number | null;
  timeSlots?: string | null;
  value?: number | null;
  totalValue?: number | null;
  paymentInfo?: string | null;
  status?: string | null;
  notes?: string | null;
};

type EventLike = {
  start: string;
  type: string;
  title: string;
  clientName?: string | null;
  description?: string | null;
  allDay?: boolean;
};

export type WorkbookData = {
  generatedAt?: string;
  clients: ClientLike[];
  contracts: ContractLike[];
  events: EventLike[];
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function nextReturn(client: ClientLike): string {
  const explicit = toDate(client.nextActionDate);
  if (explicit) return formatDateBR(explicit);
  const last = toDate(client.lastContactAt);
  if (!last) return "";
  return formatDateBR(addDays(last, client.contactFrequencyDays ?? 14));
}

function isCancelled(contract: ContractLike): boolean {
  return normalizeHeader(`${contract.number ?? ""} ${contract.notes ?? ""}`).includes("cancel");
}

function parseDescription(description: string | null | undefined) {
  const result = { responsible: "", contact: "", commercialStatus: "", history: "" };
  if (!description) return result;
  const lines = description.split(/\r?\n/);
  const history: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (normalizeHeader(trimmed).startsWith("responsavel:")) result.responsible = trimmed.split(":").slice(1).join(":").trim();
    else if (normalizeHeader(trimmed).startsWith("contato:")) result.contact = trimmed.split(":").slice(1).join(":").trim();
    else if (normalizeHeader(trimmed).startsWith("situacao:")) result.commercialStatus = trimmed.split(":").slice(1).join(":").trim();
    else history.push(trimmed);
  }
  result.history = history.join("\n");
  return result;
}

function eventTypeLabel(event: EventLike): string {
  const prefix = event.title.split("—")[0]?.trim();
  if (prefix && prefix.length < 60) return prefix;
  switch (event.type) {
    case "contact":
      return "Visita Comercial";
    case "contract_expiry":
      return "Vencimento de Contrato";
    case "video":
      return "Envio de Vídeo";
    default:
      return "Compromisso";
  }
}

export function buildWorkbookSheets(data: WorkbookData): StyledSheetSpec[] {
  const today = todayUtc();
  const activeNames = new Set(
    data.contracts
      .filter((contract) => {
        const end = toDate(contract.endDate);
        return !isCancelled(contract) && end && (diffDays(end, today) ?? -1) >= 0;
      })
      .map((contract) => normalizeHeader(contract.clientName))
  );

  const todaysEvents = data.events.filter((event) => {
    const date = toDate(event.start);
    return date != null && diffDays(date, today) === 0;
  });

  const activeClients = data.clients.filter((client) => (client.contractStatus ?? "") === "active").length;
  const activeContracts = data.contracts.filter((contract) => visualContractStatus(contract.endDate, isCancelled(contract)) === "Ativo").length;
  const nearContracts = data.contracts.filter((contract) => visualContractStatus(contract.endDate, isCancelled(contract)) === "Perto de Vencer").length;
  const expiredContracts = data.contracts.filter((contract) => visualContractStatus(contract.endDate, isCancelled(contract)) === "Vencido").length;
  const monthlyValue = data.contracts.reduce((sum, contract) => sum + (contract.value ?? 0), 0);

  const dashboardRows: (string | number)[][] = [
    ["Data de Referência (Hoje)", formatDateBR(today), weekdayName(today)],
    ["Visitas de Hoje Encontradas", todaysEvents.length, todaysEvents.map((event) => event.clientName ?? event.title).join(", ")],
    ["Clientes cadastrados", data.clients.length, ""],
    ["Clientes ativos", activeClients, ""],
    ["Contratos ativos", activeContracts, ""],
    ["Contratos perto de vencer", nearContracts, ""],
    ["Contratos vencidos", expiredContracts, ""],
    ["Valor mensal total (R$)", monthlyValue, ""],
    ["Eventos na agenda", data.events.length, ""],
  ];
  for (const event of todaysEvents) {
    dashboardRows.push(["VISITA HOJE", event.clientName ?? event.title, event.title]);
  }

  const prospectionRows = data.clients
    .filter((client) => !activeNames.has(normalizeHeader(client.name)) || (client.contractStatus ?? "") !== "active")
    .map((client) => [
      client.name,
      client.responsible ?? "",
      client.contactName ?? "",
      client.phone ?? "",
      client.commercialStatus ?? "",
      client.contractValue ?? "",
      client.offeredMediaType ?? "",
      formatDateBR(client.lastContactAt),
      client.contactType ?? "",
      client.nextAction ?? "",
      client.contactFrequencyDays ?? 14,
      formatDateBR(client.nextActionDate),
      deadlineStatus(client.nextActionDate),
      client.notes ?? "",
      diffDays(toDate(client.nextActionDate), today) === 0 ? 1 : "",
    ]);

  const clientRows = data.clients.map((client) => [
    client.legalName ?? client.name,
    client.tradeName ?? client.name,
    client.cnpj ?? "",
    client.address ?? "",
    client.phone ?? "",
    client.email ?? "",
    client.contactName ?? "",
    client.contactRole ?? "",
    client.responsible ?? "",
    formatDateBR(client.lastContactAt),
    client.nextAction ?? "",
    client.contactFrequencyDays ?? 14,
    nextReturn(client),
    client.commercialStatus ?? client.contractStatus ?? "",
    client.notes ?? "",
    clientVideoFrequency(client) === "monthly" ? "Mensal" : "Semanal",
    clientVideoFrequency(client) === "monthly" ? "" : weekdayLabel(client.videoWeekday ?? 1),
  ]);

  const contractRows = data.contracts.map((contract) => {
    const cancelled = isCancelled(contract);
    const end = toDate(contract.endDate);
    const start = toDate(contract.startDate);
    const duration =
      contract.durationMonths ??
      (start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (86400000 * 30))) : "");
    return [
      contract.number ?? "PI",
      contract.clientName,
      contract.sellerName ?? "",
      contract.program ?? "",
      formatDateBR(contract.startDate),
      duration,
      formatDateBR(contract.endDate),
      contract.mediaType ?? "Spot 30s",
      contract.insertionsPerDay ?? "",
      contract.insertionsPerMonth ?? "",
      contract.timeSlots ?? "",
      diffDays(end, today) ?? "",
      contract.value ?? "",
      contract.totalValue ?? "",
      visualContractStatus(contract.endDate, cancelled),
      renewalAlert(contract.endDate, cancelled),
      contract.paymentInfo ?? "",
      contract.notes ?? "",
    ];
  });

  const calendarRows = data.events.map((event) => {
    const parsed = parseDescription(event.description);
    return [
      formatDateBR(event.start),
      weekdayName(event.start),
      weekOfMonthLabel(event.start),
      deadlineStatus(event.start),
      eventTypeLabel(event),
      event.clientName ?? "",
      parsed.responsible,
      parsed.contact,
      parsed.commercialStatus,
      parsed.history,
    ];
  });

  const maxListLength = Math.max(
    OPTION_LISTS.sellers.length,
    OPTION_LISTS.mediaTypes.length,
    OPTION_LISTS.commercialStatuses.length,
    OPTION_LISTS.nextActions.length,
    OPTION_LISTS.contractStatuses.length,
    OPTION_LISTS.contactTypes.length
  );
  const listRows = Array.from({ length: maxListLength }, (_, index) => [
    OPTION_LISTS.sellers[index] ?? "",
    OPTION_LISTS.mediaTypes[index] ?? "",
    OPTION_LISTS.commercialStatuses[index] ?? "",
    OPTION_LISTS.nextActions[index] ?? "",
    OPTION_LISTS.contractStatuses[index] ?? "",
    OPTION_LISTS.contactTypes[index] ?? "",
  ]);

  const generated = `Gerado em ${formatDateBR(today)} • ${data.clients.length} cliente(s) • ${data.contracts.length} contrato(s) • ${data.events.length} evento(s)`;

  return [
    {
      sheetName: SHEET_LABELS.dashboard,
      title: "BACABAL FM 90.1  |  DASHBOARD & LEMBRETES",
      subtitle: "Painel automático de visitas, retornos e campanhas",
      headers: ["Indicador", "Valor", "Detalhe"],
      rows: dashboardRows,
      columnWidths: [40, 20, 60],
    },
    {
      sheetName: SHEET_LABELS.prospection,
      title: "BACABAL FM 90.1  |  PROSPECÇÃO E VISITAS COMERCIAIS",
      subtitle: generated,
      headers: PROSPECTION_HEADERS,
      rows: prospectionRows,
      columnWidths: [26, 18, 22, 16, 18, 16, 18.86, 15, 16, 22, 14, 16, 16, 54, 12],
    },
    {
      sheetName: SHEET_LABELS.clients,
      title: "BACABAL FM 90.1  |  CADASTRO DE CLIENTES E HISTÓRICO COMERCIAL",
      subtitle: generated,
      headers: CLIENT_HEADERS,
      rows: clientRows,
      columnWidths: [30, 24, 20, 28, 22, 24, 22, 18, 18, 16, 26, 15, 18, 18, 56, 14, 22],
    },
    {
      sheetName: SHEET_LABELS.contracts,
      title: "BACABAL FM 90.1  |  CONTROLE DE CONTRATOS ASSINADOS & VEICULAÇÃO",
      subtitle: "Datas, dias restantes, status e alertas são calculados automaticamente",
      headers: CONTRACT_HEADERS,
      rows: contractRows,
      columnWidths: [15, 24, 18, 22, 14, 14, 18, 24, 18.43, 16, 30, 14, 16, 18, 18, 18, 30, 44],
    },
    {
      sheetName: SHEET_LABELS.calendar,
      title: "BACABAL FM 90.1  |  CALENDÁRIO INTEGRADO DE VISITAS, RETORNOS E CAMPANHAS",
      subtitle: generated,
      headers: CALENDAR_HEADERS,
      rows: calendarRows,
      columnWidths: [15, 16, 20, 14, 28, 26, 18, 26, 18, 54],
    },
    {
      sheetName: SHEET_LABELS.lists,
      title: "BACABAL FM 90.1  |  LISTAS DE OPÇÕES PADRONIZADAS",
      subtitle: "Valores usados nos formulários e importações",
      headers: LIST_HEADERS,
      rows: listRows,
      columnWidths: [26, 26, 29.29, 26, 27.29, 22.29],
    },
  ];
}
