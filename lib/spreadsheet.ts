export type Matrix = unknown[][];
export type SheetMatrices = Record<string, Matrix>;

export const SHEET_LABELS = {
  dashboard: "DASHBOARD & LEMBRETES",
  prospection: "PROSPECÇÃO E VISITAS",
  clients: "CADASTRO DE CLIENTES",
  contracts: "CONTROLE DE CONTRATOS",
  calendar: "CALENDÁRIO DE VISITAS",
  lists: "OPÇÕES E LISTAS",
} as const;

export const DASHBOARD_CLIENT_HEADERS = [
  "Cliente / Anunciante",
  "Contato / Decisor",
  "WhatsApp",
  "Vendedor",
  "Situação",
  "Próxima Ação",
  "Valor Proposto",
  "Data Agendada",
  "Histórico / Resumo da Visita",
];

export const DASHBOARD_CONTRACT_HEADERS = [
  "Nº PI / Contrato",
  "Cliente / Anunciante",
  "Vendedor",
  "Formato Mídia",
  "Término",
  "Dias Restantes",
  "Faixa de Alerta",
  "Status Visual",
  "Ação Recomendada",
];

export const CLIENT_HEADERS = [
  "Razão Social",
  "Nome Fantasia / Cliente",
  "CNPJ / CPF",
  "Endereço Completo",
  "Telefone / WhatsApp",
  "E-mail",
  "Contato Responsável",
  "Cargo / Setor",
  "Vendedor / Representante",
  "Data Último Contato",
  "Próxima Ação",
  "Prazo Retorno (Dias)",
  "Data Próximo Retorno (Auto)",
  "Situação Comercial",
  "Histórico de Contatos / Detalhes do PI",
  "Frequência Vídeo",
  "Dias Vídeo",
];

export const PROSPECTION_HEADERS = [
  "Cliente / Anunciante",
  "Responsável",
  "Contato / Decisor",
  "WhatsApp",
  "Situação Comercial",
  "Valor Proposto (R$)",
  "Tipo de Mídia Ofertada",
  "Último Contato",
  "Tipo de Contato",
  "Próxima Ação",
  "Prazo Retorno (Dias)",
  "Data Próxima Ação",
  "Status Prazo (Hoje)",
  "Histórico / Observações",
  "Ref_Hoje",
];

export const CONTRACT_HEADERS = [
  "Nº Contrato / PI",
  "Cliente / Anunciante",
  "Vendedor Responsável",
  "Programa / Faixa",
  "Data de Início",
  "Duração (Meses)",
  "Data de Término (Auto)",
  "Tipo de Mídia",
  "Qtd. Inserções / Dia",
  "Total Inserções / Mês",
  "Horários de Veiculação",
  "Dias Restantes",
  "Valor Mensal (R$)",
  "Valor Total / Valor Bruto",
  "Status Visual",
  "Alerta Renovação",
  "Pagamento / Vencimento",
  "Observações de Veiculação",
];

export const CALENDAR_HEADERS = [
  "Data Agendada",
  "Dia da Semana",
  "Semana / Mês",
  "Status Prazo",
  "Tipo de Compromisso",
  "Cliente / Anunciante",
  "Vendedor / Responsável",
  "Contato / WhatsApp",
  "Situação Comercial",
  "Histórico / Detalhes",
];

export const LIST_HEADERS = [
  "Vendedores / Representantes",
  "Tipo de Mídia (Rádio)",
  "Situação Comercial",
  "Próxima Ação",
  "Status do Contrato",
  "Tipo de Contato",
];

export const OPTION_LISTS = {
  sellers: [
    "Sérgio Muller",
    "Carlos",
    "Carlos Henrique",
    "Fladyane Lisboa",
    "Léo Axé",
    "Márcio Terceiro",
    "Lucas",
    "Lucas Felix",
    "Carlos Antonio",
    "Outro / A definir",
  ],
  mediaTypes: [
    "Spot 30s",
    "Patrocínio de Programa",
    "Testemunhal ao Vivo",
    "Flash ao Vivo / Blitz",
    "Spot 30s + Testemunhal",
    "Spot 30s + Testemunhal 60s",
    "Projeto Especial",
  ],
  commercialStatuses: [
    "Não contatado(Cliente Novo)",
    "Não contatado",
    "Contato realizado",
    "Visita a agendar",
    "Visita agendada",
    "Visita remarcada",
    "Visita realizada",
    "Decisor ausente / Retornar",
    "Proposta a elaborar",
    "Proposta enviada",
    "Em negociação",
    "Aguardando agência / Diretoria",
    "Aguardando PI",
    "Aguardando retorno",
    "Contrato Aguardando Assinatura",
    "Aguardando Início",
    "Contrato Fechado",
    "Contrato Vigente",
    "Retomar futuramente",
    "Sem interesse",
    "A confirmar",
  ],
  nextActions: [
    "Ligar",
    "Enviar WhatsApp",
    "Agendar visita",
    "Realizar visita",
    "Realizar visita / retorno",
    "Enviar proposta",
    "Cobrar retorno",
    "Negociar condições",
    "Solicitar PI",
    "Confirmar recebimento da PI",
    "Acompanhar veiculação / renovação",
    "Confirmar vigência / definir início",
    "Retomar futuramente",
    "A definir",
  ],
  contractStatuses: ["Ativo", "Perto de Vencer", "Vencido"],
  contactTypes: [
    "Visita Presencial",
    "Visita",
    "WhatsApp",
    "Ligação Telefônica",
    "Ligação",
    "Reunião na Rádio",
    "Reunião",
    "E-mail",
    "Outro",
  ],
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeName(value: unknown): string {
  return normalizeHeader(value);
}

export function toText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).replace(/\u00a0/g, " ").trim();
  return text === "" ? null : text;
}

export function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function toInt(value: unknown): number | null {
  const n = toNumber(value);
  return n == null ? null : Math.round(n);
}

export function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const text = String(value).trim();
  if (!text) return null;
  let match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (match) {
    const year = match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);
    const date = new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function diffDays(target: Date | null, base = todayUtc()): number | null {
  if (!target) return null;
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export function findSheet(sheets: SheetMatrices, token: string): Matrix | null {
  const wanted = normalizeHeader(token);
  for (const [name, matrix] of Object.entries(sheets)) {
    if (!Array.isArray(matrix)) continue;
    const normalized = normalizeHeader(name);
    if (normalized === wanted || normalized.includes(wanted) || wanted.includes(normalized)) return matrix;
  }
  return null;
}

export function findHeaderRow(rows: Matrix, expected: string[]): number {
  const wanted = expected.map(normalizeHeader);
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const cells = row.map(normalizeHeader);
    const score = wanted.filter((w) => cells.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= Math.min(3, expected.length) ? bestIndex : -1;
}

export function matrixToObjects(rows: Matrix, headerRow: number): Record<string, unknown>[] {
  const headers = (rows[headerRow] ?? []).map((h) => toText(h) ?? "");
  return rows
    .slice(headerRow + 1)
    .map((row) => {
      const obj: Record<string, unknown> = {};
      const cells = Array.isArray(row) ? row : [];
      headers.forEach((header, index) => {
        if (header) obj[header] = cells[index] ?? null;
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v != null && String(v).trim() !== ""));
}

export function readSheet(sheets: SheetMatrices, token: string, expected: string[]): Record<string, unknown>[] {
  const matrix = findSheet(sheets, token);
  if (!matrix) return [];
  const headerRow = findHeaderRow(matrix, expected);
  if (headerRow < 0) return [];
  return matrixToObjects(matrix, headerRow);
}

function readTableUntilBlank(sheets: SheetMatrices, token: string, expected: string[]): Record<string, unknown>[] {
  const matrix = findSheet(sheets, token);
  if (!matrix) return [];
  const headerRow = findHeaderRow(matrix, expected);
  if (headerRow < 0) return [];
  const headers = (matrix[headerRow] ?? []).map((header) => toText(header) ?? "");
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRow + 1; i < matrix.length; i++) {
    const row = Array.isArray(matrix[i]) ? matrix[i] : [];
    const firstValue = row[0];
    if (firstValue == null || String(firstValue).trim() === "") break;
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index] ?? null;
    });
    if (Object.values(record).some((value) => value != null && String(value).trim() !== "")) rows.push(record);
  }
  return rows;
}

function cell(row: Record<string, unknown>, ...names: string[]): unknown {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) map.set(normalizeHeader(key), value);
  for (const name of names) {
    const value = map.get(normalizeHeader(name));
    if (value != null && String(value).trim() !== "") return value;
  }
  return null;
}

export type ClientContractStatus = "active" | "paused" | "ended" | "negotiation";

export type ParsedClient = {
  name: string;
  legalName: string | null;
  tradeName: string | null;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  contactRole: string | null;
  responsible: string | null;
  offeredMediaType: string | null;
  videoFrequency: "weekly" | "monthly";
  videoWeekday: number;
  lastContactAt: Date | null;
  nextAction: string | null;
  contactFrequencyDays: number;
  nextActionDate: Date | null;
  commercialStatus: string | null;
  contactType: string | null;
  contractValue: number | null;
  notes: string | null;
  contractStatus: ClientContractStatus;
};

export type ParsedContract = {
  number: string | null;
  clientName: string;
  sellerName: string | null;
  program: string | null;
  startDate: Date;
  durationMonths: number | null;
  endDate: Date;
  mediaType: string;
  insertionsPerDay: number | null;
  insertionsPerMonth: number | null;
  timeSlots: string | null;
  value: number | null;
  totalValue: number | null;
  paymentInfo: string | null;
  notes: string | null;
  status: "active" | "near_expiry" | "expired";
};

export type ParsedEvent = {
  start: Date;
  type: "video" | "contact" | "contract_expiry" | "custom";
  title: string;
  clientName: string | null;
  responsible: string | null;
  contact: string | null;
  commercialStatus: string | null;
  history: string | null;
  description: string | null;
};

export function deriveContractStatus(value: unknown): ClientContractStatus {
  const status = normalizeHeader(value);
  if (!status) return "negotiation";
  if (status.includes("cancel") || status.includes("sem interesse") || status.includes("encerr")) return "ended";
  if (status.includes("fechado") || status.includes("vigente") || status.includes("no ar") || status === "ativo") return "active";
  return "negotiation";
}

export function videoFrequencyFromValue(value: unknown): "weekly" | "monthly" {
  const normalized = normalizeHeader(value);
  return normalized.includes("mensal") || normalized.includes("monthly") ? "monthly" : "weekly";
}

export function videoWeekdayFromValue(value: unknown): number {
  return Math.max(0, Math.min(127, toInt(value) ?? 1));
}

function joinNotes(...values: (string | null)[]): string | null {
  const parts = values.filter((v): v is string => Boolean(v && v.trim()));
  if (parts.length === 0) return null;
  const unique: string[] = [];
  for (const part of parts) if (!unique.includes(part)) unique.push(part);
  return unique.join("\n\n");
}

function latestDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function buildClientFromCadastro(row: Record<string, unknown>): ParsedClient | null {
  const name = toText(cell(row, "Nome Fantasia / Cliente", "Cliente / Anunciante", "Razão Social"));
  if (!name) return null;
  const commercialStatus = toText(cell(row, "Situação Comercial"));
  return {
    name,
    legalName: toText(cell(row, "Razão Social")),
    tradeName: toText(cell(row, "Nome Fantasia / Cliente")) ?? name,
    cnpj: toText(cell(row, "CNPJ / CPF")),
    address: toText(cell(row, "Endereço Completo")),
    phone: toText(cell(row, "Telefone / WhatsApp")),
    email: toText(cell(row, "E-mail")),
    contactName: toText(cell(row, "Contato Responsável")),
    contactRole: toText(cell(row, "Cargo / Setor")),
    responsible: toText(cell(row, "Vendedor / Representante")),
    offeredMediaType: null,
    videoFrequency: videoFrequencyFromValue(cell(row, "Frequência Vídeo")),
    videoWeekday: videoWeekdayFromValue(cell(row, "Dias Vídeo")),
    lastContactAt: toDate(cell(row, "Data Último Contato")),
    nextAction: toText(cell(row, "Próxima Ação")),
    contactFrequencyDays: toInt(cell(row, "Prazo Retorno (Dias)")) ?? 14,
    nextActionDate: toDate(cell(row, "Data Próximo Retorno (Auto)")),
    commercialStatus,
    contactType: null,
    contractValue: null,
    notes: toText(cell(row, "Histórico de Contatos / Detalhes do PI")),
    contractStatus: deriveContractStatus(commercialStatus),
  };
}

function buildClientFromProspection(row: Record<string, unknown>): ParsedClient | null {
  const name = toText(cell(row, "Cliente / Anunciante", "Nome Fantasia / Cliente"));
  if (!name) return null;
  const commercialStatus = toText(cell(row, "Situação Comercial"));
  return {
    name,
    legalName: null,
    tradeName: name,
    cnpj: null,
    address: null,
    phone: toText(cell(row, "WhatsApp", "Telefone / WhatsApp")),
    email: null,
    contactName: toText(cell(row, "Contato / Decisor")),
    contactRole: null,
    responsible: toText(cell(row, "Responsável", "Vendedor / Representante")),
    offeredMediaType: toText(cell(row, "Tipo de Mídia Ofertada")),
    videoFrequency: videoFrequencyFromValue(cell(row, "Frequência Vídeo")),
    videoWeekday: videoWeekdayFromValue(cell(row, "Dias Vídeo")),
    lastContactAt: toDate(cell(row, "Último Contato", "Data Último Contato")),
    nextAction: toText(cell(row, "Próxima Ação")),
    contactFrequencyDays: toInt(cell(row, "Prazo Retorno (Dias)")) ?? 14,
    nextActionDate: toDate(cell(row, "Data Próxima Ação", "Data Próximo Retorno (Auto)")),
    commercialStatus,
    contactType: toText(cell(row, "Tipo de Contato")),
    contractValue: toNumber(cell(row, "Valor Proposto (R$)")),
    notes: toText(cell(row, "Histórico / Observações")),
    contractStatus: deriveContractStatus(commercialStatus),
  };
}

function mergeClients(cadastro: ParsedClient, prospection: ParsedClient | undefined): ParsedClient {
  if (!prospection) return cadastro;
  return {
    ...cadastro,
    phone: cadastro.phone ?? prospection.phone,
    contactName: cadastro.contactName ?? prospection.contactName,
    responsible: cadastro.responsible ?? prospection.responsible,
    offeredMediaType: cadastro.offeredMediaType ?? prospection.offeredMediaType,
    videoFrequency: cadastro.videoFrequency,
    videoWeekday: cadastro.videoWeekday,
    lastContactAt: latestDate(cadastro.lastContactAt, prospection.lastContactAt),
    nextAction: cadastro.nextAction ?? prospection.nextAction,
    nextActionDate: latestDate(cadastro.nextActionDate, prospection.nextActionDate),
    commercialStatus: cadastro.commercialStatus ?? prospection.commercialStatus,
    contactType: cadastro.contactType ?? prospection.contactType,
    contractValue: cadastro.contractValue ?? prospection.contractValue,
    notes: joinNotes(cadastro.notes, prospection.notes),
    contractStatus: deriveContractStatus(cadastro.commercialStatus ?? prospection.commercialStatus),
  };
}

function buildClientFromDashboard(row: Record<string, unknown>): ParsedClient | null {
  const name = toText(cell(row, "Cliente / Anunciante"));
  if (!name) return null;
  const commercialStatus = toText(cell(row, "Situação"));
  return {
    name,
    legalName: null,
    tradeName: name,
    cnpj: null,
    address: null,
    phone: toText(cell(row, "WhatsApp")),
    email: null,
    contactName: toText(cell(row, "Contato / Decisor")),
    contactRole: null,
    responsible: toText(cell(row, "Vendedor")),
    offeredMediaType: null,
    videoFrequency: "weekly",
    videoWeekday: 1,
    lastContactAt: null,
    nextAction: toText(cell(row, "Próxima Ação")),
    contactFrequencyDays: 14,
    nextActionDate: toDate(cell(row, "Data Agendada")),
    commercialStatus,
    contactType: null,
    contractValue: toNumber(cell(row, "Valor Proposto")),
    notes: toText(cell(row, "Histórico / Resumo da Visita")),
    contractStatus: deriveContractStatus(commercialStatus),
  };
}

export function parseDashboardClients(sheets: SheetMatrices): ParsedClient[] {
  const rows = readTableUntilBlank(sheets, "dashboard", DASHBOARD_CLIENT_HEADERS);
  const byName = new Map<string, ParsedClient>();
  for (const row of rows) {
    const parsed = buildClientFromDashboard(row);
    if (!parsed) continue;
    const key = normalizeName(parsed.name);
    if (!byName.has(key)) byName.set(key, parsed);
  }
  return Array.from(byName.values());
}

export function parseClients(sheets: SheetMatrices): ParsedClient[] {
  const dashboardClients = parseDashboardClients(sheets);
  if (dashboardClients.length) return dashboardClients;

  const cadastroRows = readSheet(sheets, "cadastro", CLIENT_HEADERS);
  const prospectionRows = readSheet(sheets, "prospeccao", PROSPECTION_HEADERS);

  const byName = new Map<string, ParsedClient>();

  for (const row of cadastroRows) {
    const parsed = buildClientFromCadastro(row);
    if (!parsed) continue;
    const key = normalizeName(parsed.name);
    if (!byName.has(key)) byName.set(key, parsed);
  }

  for (const row of prospectionRows) {
    const parsed = buildClientFromProspection(row);
    if (!parsed) continue;
    const key = normalizeName(parsed.name);
    const existing = byName.get(key);
    if (existing) byName.set(key, mergeClients(existing, parsed));
    else byName.set(key, parsed);
  }

  return Array.from(byName.values());
}

function buildContractFromDashboard(row: Record<string, unknown>, today: Date): ParsedContract | null {
  const clientName = toText(cell(row, "Cliente / Anunciante"));
  if (!clientName) return null;

  const rawNumber = toText(cell(row, "Nº PI / Contrato", "Número"));
  const number = rawNumber && normalizeHeader(rawNumber) !== "pi" ? rawNumber : null;
  const notes = toText(cell(row, "Ação Recomendada"));
  const endDate = toDate(cell(row, "Término")) ?? today;
  const startDate = addMonths(endDate, -1);
  const visualStatus = normalizeHeader(toText(cell(row, "Status Visual")));
  const cancelled = normalizeHeader(`${rawNumber ?? ""} ${notes ?? ""}`).includes("cancel") || visualStatus.includes("cancel");
  const days = diffDays(endDate, today) ?? 0;
  const status = cancelled || days < 0 ? "expired" : days <= 30 || visualStatus.includes("perto") ? "near_expiry" : "active";

  return {
    number,
    clientName,
    sellerName: toText(cell(row, "Vendedor")),
    program: null,
    startDate,
    durationMonths: null,
    endDate,
    mediaType: toText(cell(row, "Formato Mídia")) ?? "Spot 30s",
    insertionsPerDay: null,
    insertionsPerMonth: null,
    timeSlots: null,
    value: null,
    totalValue: null,
    paymentInfo: null,
    notes,
    status,
  };
}

export function parseDashboardContracts(sheets: SheetMatrices): ParsedContract[] {
  const rows = readTableUntilBlank(sheets, "dashboard", DASHBOARD_CONTRACT_HEADERS);
  const today = todayUtc();
  const contracts: ParsedContract[] = [];
  for (const row of rows) {
    const parsed = buildContractFromDashboard(row, today);
    if (parsed) contracts.push(parsed);
  }
  return contracts;
}

export function parseContracts(sheets: SheetMatrices): ParsedContract[] {
  const dashboardContracts = parseDashboardContracts(sheets);
  if (dashboardContracts.length) return dashboardContracts;

  const rows = readSheet(sheets, "controle", CONTRACT_HEADERS);
  const contracts: ParsedContract[] = [];
  const today = todayUtc();

  for (const row of rows) {
    const clientName = toText(cell(row, "Cliente / Anunciante", "Cliente"));
    if (!clientName) continue;

    const rawNumber = toText(cell(row, "Nº Contrato / PI", "Número"));
    const number = rawNumber && normalizeHeader(rawNumber) !== "pi" ? rawNumber : null;
    const durationMonths = toInt(cell(row, "Duração (Meses)"));
    const startDate = toDate(cell(row, "Data de Início")) ?? today;
    const explicitEnd = toDate(cell(row, "Data de Término (Auto)", "Data Término"));
    const endDate = explicitEnd ?? addMonths(startDate, Math.max(durationMonths ?? 1, 1));
    const notes = toText(cell(row, "Observações de Veiculação"));
    const cancelled = normalizeHeader(`${rawNumber ?? ""} ${notes ?? ""}`).includes("cancel");
    const days = diffDays(endDate, today) ?? 0;
    const status = cancelled || days < 0 ? "expired" : days <= 30 ? "near_expiry" : "active";

    contracts.push({
      number,
      clientName,
      sellerName: toText(cell(row, "Vendedor Responsável", "Vendedor")),
      program: toText(cell(row, "Programa / Faixa")),
      startDate,
      durationMonths,
      endDate,
      mediaType: toText(cell(row, "Tipo de Mídia")) ?? "Spot 30s",
      insertionsPerDay: toInt(cell(row, "Qtd. Inserções / Dia")),
      insertionsPerMonth: toInt(cell(row, "Total Inserções / Mês")),
      timeSlots: toText(cell(row, "Horários de Veiculação")),
      value: toNumber(cell(row, "Valor Mensal (R$)")),
      totalValue: toNumber(cell(row, "Valor Total / Valor Bruto")),
      paymentInfo: toText(cell(row, "Pagamento / Vencimento")),
      notes,
      status,
    });
  }

  return contracts;
}

function eventTypeFromLabel(label: string | null): ParsedEvent["type"] {
  const value = normalizeHeader(label);
  if (value.includes("renov") || value.includes("vencimento")) return "contract_expiry";
  if (value.includes("video")) return "video";
  if (value.includes("visita") || value.includes("retorno") || value.includes("follow")) return "contact";
  return "custom";
}

export function parseEvents(sheets: SheetMatrices): ParsedEvent[] {
  const rows = readSheet(sheets, "calendario", CALENDAR_HEADERS);
  const events: ParsedEvent[] = [];

  for (const row of rows) {
    const start = toDate(cell(row, "Data Agendada"));
    const clientName = toText(cell(row, "Cliente / Anunciante"));
    if (!start || !clientName) continue;

    const typeLabel = toText(cell(row, "Tipo de Compromisso"));
    const contact = toText(cell(row, "Contato / WhatsApp"));
    const commercialStatus = toText(cell(row, "Situação Comercial"));
    const history = toText(cell(row, "Histórico / Detalhes"));
    const responsible = toText(cell(row, "Vendedor / Responsável"));
    const title = typeLabel ? `${typeLabel} — ${clientName}` : `Compromisso — ${clientName}`;
    const description = [
      responsible ? `Responsável: ${responsible}` : null,
      contact ? `Contato: ${contact}` : null,
      commercialStatus ? `Situação: ${commercialStatus}` : null,
      history,
    ]
      .filter(Boolean)
      .join("\n");

    events.push({
      start,
      type: eventTypeFromLabel(typeLabel),
      title,
      clientName,
      responsible,
      contact,
      commercialStatus,
      history,
      description: description || null,
    });
  }

  return events;
}

export function formatDateBR(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function weekdayName(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][date.getUTCDay()];
}

export function weekOfMonthLabel(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const monthName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][date.getUTCMonth()];
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const week = Math.ceil(((date.getTime() - first.getTime()) / 86400000 + first.getUTCDay() + 1) / 7);
  return `Sem ${week} - ${monthName}/${String(date.getUTCFullYear()).slice(-2)}`;
}

export function deadlineStatus(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "Sem data";
  const days = diffDays(date) ?? 0;
  if (days === 0) return "HOJE";
  if (days < 0) return `Atrasado (${Math.abs(days)}d)`;
  return `Em ${days}d`;
}

export function visualContractStatus(endDate: Date | string | null | undefined, cancelled = false): string {
  if (cancelled) return "Vencido";
  const days = diffDays(toDate(endDate));
  if (days == null) return "";
  if (days < 0) return "Vencido";
  if (days <= 30) return "Perto de Vencer";
  return "Ativo";
}

export function renewalAlert(endDate: Date | string | null | undefined, cancelled = false): string {
  if (cancelled) return "CONTRATO CANCELADO";
  const days = diffDays(toDate(endDate));
  if (days == null) return "";
  if (days < 0) return "VENCIDO";
  if (days <= 5) return "ALERTA 5 DIAS";
  if (days <= 15) return "ALERTA 15 DIAS";
  if (days <= 30) return "ALERTA 30 DIAS";
  return "Vigente (>30d)";
}
