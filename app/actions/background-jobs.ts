"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { createBackgroundJob, markJobCompleted, markJobFailed, markJobProgress, markJobRunning } from "@/lib/background-jobs";
import { ensureClientContactEventsForUser } from "@/app/actions/events";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return { id: session.user.id as string, role: (session.user as { role?: string }).role };
}

export async function getBackgroundJobsAction() {
  const user = await getUser();
  return prisma.backgroundJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function getBackgroundJobAction(id: string) {
  const user = await getUser();
  return prisma.backgroundJob.findFirst({ where: { id, userId: user.id } });
}

async function runDeleteSyncedGoogleEvents(jobId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
    });
    const events = await prisma.event.findMany({ where: { userId, googleEventId: { not: null } }, orderBy: { start: "asc" } });
    await markJobRunning(jobId, events.length);
    let deleted = 0;
    let failed = 0;
    if (user?.googleCalendarConnected && user.googleAccessToken) {
      const calendarId = user.googleCalendarId || "primary";
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev.googleEventId) { await markJobProgress(jobId, i + 1, events.length, `Processando ${i + 1}/${events.length}`); continue; }
        try {
          await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: null } });
          deleted++;
        } catch (e) {
          console.error("google bulk delete error", e);
          failed++;
        }
        await markJobProgress(jobId, i + 1, events.length, `Removendo ${i + 1}/${events.length}`);
      }
    }
    await markJobCompleted(jobId, { deleted, failed, total: events.length }, `Removidos ${deleted} de ${events.length}`);
    revalidatePath("/calendar");
    revalidatePath("/settings");
  } catch (e) {
    await markJobFailed(jobId, e instanceof Error ? e.message : String(e));
  }
}

async function runSyncGoogleIntegration(jobId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true, autoCreateEvents: true },
    });
    if (!user?.googleCalendarConnected || !user.googleAccessToken) {
      await markJobFailed(jobId, "Google não conectado");
      return;
    }
    const calendarId = user.googleCalendarId || "primary";
    const linked = await prisma.event.findMany({ where: { userId, googleEventId: { not: null } }, orderBy: { start: "asc" } });
    const local = user.autoCreateEvents ? await prisma.event.findMany({ where: { userId }, orderBy: { start: "asc" } }) : [];
    const total = linked.length + local.length;
    await markJobRunning(jobId, total);

    let deleted = 0;
    let deleteFailed = 0;
    let processed = 0;
    for (const ev of linked) {
      if (ev.googleEventId) {
        try {
          await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: null } });
          deleted++;
        } catch (e) {
          console.error("google sync delete error", e);
          deleteFailed++;
        }
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Removendo ${processed}/${linked.length}`);
    }

    let pushed = 0;
    let pushFailed = 0;
    for (let i = 0; i < local.length; i++) {
      const ev = local[i];
      try {
        const gid = await createCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, {
          title: ev.title, description: ev.description ?? undefined, start: ev.start, end: ev.end, allDay: ev.allDay,
        });
        if (gid) {
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: gid } });
          pushed++;
        }
      } catch (e) {
        console.error("google sync push error", e);
        pushFailed++;
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Recriando ${i + 1}/${local.length}`);
    }

    const message = user.autoCreateEvents
      ? `Removidos ${deleted}, recriados ${pushed}${deleteFailed + pushFailed ? `, ${deleteFailed + pushFailed} falha(s)` : ""}`
      : `Removidos ${deleted} do Google. Criação automática desativada.`;
    await markJobCompleted(jobId, { deleted, deleteFailed, pushed, pushFailed, total, autoCreateEvents: user.autoCreateEvents }, message);
    revalidatePath("/calendar");
    revalidatePath("/settings");
  } catch (e) {
    await markJobFailed(jobId, e instanceof Error ? e.message : String(e));
  }
}

export async function startDeleteSyncedGoogleEventsJobAction() {
  const user = await getUser();
  const job = await createBackgroundJob(user.id, "google_delete_synced", "Apagar eventos do site no Google");
  after(() => runDeleteSyncedGoogleEvents(job.id, user.id));
  return { jobId: job.id };
}

function toDateValue(v: any): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") { const d = new Date((v - 25569) * 86400 * 1000); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(v); return isNaN(d.getTime()) ? null : d;
}
function toNumberValue(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^0-9,.-]/g, "").replace(",", ".")); return isNaN(n) ? null : n;
}
function normImportText(v: unknown) { return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase(); }
function normImportDate(v: unknown) { const d = toDateValue(v); return d ? d.toISOString().slice(0, 10) : ""; }
function normImportNum(v: unknown) { const n = toNumberValue(v); return n == null ? "" : String(n); }
function clientImportKey(r: Record<string, any>) {
  const contractStatus = (["active","paused","ended","negotiation"].includes(String(r.contractStatus)) ? String(r.contractStatus) : "active");
  return [normImportText(r.name ?? r["Cliente / anunciante"] ?? r.Nome ?? "Sem nome"), normImportText(r.responsible ?? r["Responsável"]), normImportText(r.contactName ?? r["Contato / decisor"] ?? r.Contato), normImportText(r.phone ?? r.WhatsApp ?? r.Telefone), normImportText(r.email ?? r.Email), normImportText(r.commercialStatus ?? r["Situação comercial"]), normImportNum(r.contractValue ?? r["Valor proposto (R$)"]), normImportDate(r.lastContactAt ?? r["Último contato"]), normImportText(r.contactType ?? r["Tipo de contato"]), normImportText(r.nextAction ?? r["Próxima ação"]), normImportDate(r.nextActionDate ?? r["Data próxima ação"]), normImportText(r.notes ?? r["Histórico / observações"] ?? r.Observações), normImportDate(r.dateConference ?? r["Conferência de datas"]), String(Math.max(0, Math.min(127, Number(r.videoWeekday ?? r["Dias Vídeo"] ?? 1) || 1))), String(Math.max(1, Math.min(365, Number(r.contactFrequencyDays ?? 14) || 14))), contractStatus].join("|");
}
function existingClientKey(c: any) {
  return [normImportText(c.name),normImportText(c.responsible),normImportText(c.contactName),normImportText(c.phone),normImportText(c.email),normImportText(c.commercialStatus),normImportNum(c.contractValue),normImportDate(c.lastContactAt),normImportText(c.contactType),normImportText(c.nextAction),normImportDate(c.nextActionDate),normImportText(c.notes),normImportDate(c.dateConference),String(Math.max(0,Math.min(127,Number(c.videoWeekday ?? 1)||1))),String(Math.max(1,Math.min(365,Number(c.contactFrequencyDays ?? 14)||14))),String(c.contractStatus ?? "active")].join("|");
}
function contractImportKey(r: Record<string, any>, clientId: string) {
  const mediaType = (["spot","sponsorship","testimonial","other"].includes(String(r.mediaType)) ? String(r.mediaType) : "spot");
  return [clientId,normImportText(r.number ?? r.Número),normImportText(r.sellerName ?? r["Vendedor"]),mediaType,normImportDate(r.startDate ?? r["Data Início"]),normImportDate(r.endDate ?? r["Data Término"]),normImportNum(r.insertions ?? r.Inserções),normImportText(r.timeSlots ?? r.Horários),normImportNum(r.value ?? r.Valor),normImportText(r.notes ?? r.Observações)].join("|");
}
function existingContractKey(c: any) {
  return [String(c.clientId),normImportText(c.number),normImportText(c.sellerName),String(c.mediaType ?? "spot"),normImportDate(c.startDate),normImportDate(c.endDate),normImportNum(c.insertions),normImportText(c.timeSlots),normImportNum(c.value),normImportText(c.notes)].join("|");
}

async function runImportClients(jobId: string, userId: string, role: string | undefined, rows: any[]) {
  try {
    const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
    await markJobRunning(jobId, safeRows.length);
    const existing = await prisma.client.findMany({ where: { userId } });
    const seen = new Set(existing.map(existingClientKey));
    let count = 0, skipped = 0;
    for (let i = 0; i < safeRows.length; i++) {
      const r = safeRows[i];
      if (!r || typeof r !== "object") { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Importando ${i + 1}/${safeRows.length}`); continue; }
      const key = clientImportKey(r);
      if (seen.has(key)) { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Pulando duplicado ${i + 1}/${safeRows.length}`); continue; }
      const name = String(r.name ?? r["Cliente / anunciante"] ?? r.Nome ?? "Sem nome").slice(0, 200);
      await prisma.client.create({ data: {
        userId, vendorId: userId, name,
        phone: r.phone ?? r.WhatsApp ?? r.Telefone ?? null,
        email: r.email ?? r.Email ?? null,
        contactName: r.contactName ?? r["Contato / decisor"] ?? r.Contato ?? null,
        videoWeekday: Math.max(0, Math.min(127, Number(r.videoWeekday ?? r["Dias Vídeo"] ?? 1) || 1)),
        contactFrequencyDays: Math.max(1, Math.min(365, Number(r.contactFrequencyDays ?? 14) || 14)),
        contractStatus: (["active","paused","ended","negotiation"].includes(String(r.contractStatus)) ? r.contractStatus : "active") as any,
        notes: r.notes ?? r["Histórico / observações"] ?? r.Observações ?? null,
        responsible: r.responsible ?? r["Responsável"] ?? null,
        commercialStatus: r.commercialStatus ?? r["Situação comercial"] ?? null,
        contactType: r.contactType ?? r["Tipo de contato"] ?? null,
        nextAction: r.nextAction ?? r["Próxima ação"] ?? null,
        nextActionDate: toDateValue(r.nextActionDate ?? r["Data próxima ação"]),
        dateConference: toDateValue(r.dateConference ?? r["Conferência de datas"]),
        contractValue: toNumberValue(r.contractValue ?? r["Valor proposto (R$)"]),
        lastContactAt: toDateValue(r.lastContactAt ?? r["Último contato"]),
      }});
      seen.add(key); count++;
      await markJobProgress(jobId, i + 1, safeRows.length, `Importando ${i + 1}/${safeRows.length}`);
    }
    await ensureClientContactEventsForUser(userId, role);
    await markJobCompleted(jobId, { count, skipped, total: safeRows.length }, `Importados ${count}, pulados ${skipped}`);
    revalidatePath("/clients");
  } catch (e) { await markJobFailed(jobId, e instanceof Error ? e.message : String(e)); }
}

async function runImportContracts(jobId: string, userId: string, role: string | undefined, rows: any[]) {
  try {
    const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
    await markJobRunning(jobId, safeRows.length);
    const existingWhere: any = role === "admin" ? {} : { vendorId: userId };
    const existing = await prisma.contract.findMany({ where: existingWhere });
    const seen = new Set(existing.map(existingContractKey));
    let count = 0, skipped = 0;
    for (let i = 0; i < safeRows.length; i++) {
      const r = safeRows[i];
      if (!r || typeof r !== "object") { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Importando ${i + 1}/${safeRows.length}`); continue; }
      const clientName = String(r.client ?? r.Cliente ?? "").trim();
      if (!clientName) { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Importando ${i + 1}/${safeRows.length}`); continue; }
      const clientWhere: any = { name: clientName };
      if (role !== "admin") clientWhere.OR = [{ userId }, { vendorId: userId }];
      const client = await prisma.client.findFirst({ where: clientWhere, select: { id: true } });
      if (!client) { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Cliente não encontrado ${i + 1}/${safeRows.length}`); continue; }
      const key = contractImportKey(r, client.id);
      if (seen.has(key)) { skipped++; await markJobProgress(jobId, i + 1, safeRows.length, `Pulando duplicado ${i + 1}/${safeRows.length}`); continue; }
      const start = new Date(r.startDate ?? r["Data Início"] ?? new Date());
      const end = new Date(r.endDate ?? r["Data Término"] ?? new Date());
      await prisma.contract.create({ data: {
        number: r.number ?? r.Número ?? null, clientId: client.id, vendorId: userId,
        sellerName: r.sellerName ?? r["Vendedor"] ?? null,
        startDate: Number.isNaN(start.getTime()) ? new Date() : start,
        endDate: Number.isNaN(end.getTime()) ? new Date() : end,
        mediaType: (["spot","sponsorship","testimonial","other"].includes(String(r.mediaType)) ? String(r.mediaType) : "spot") as any,
        insertions: r.insertions ? Number(r.insertions) : null,
        timeSlots: r.timeSlots ?? r.Horários ?? null,
        value: r.value ? Number(r.value) : null,
        notes: r.notes ?? null,
      }});
      seen.add(key); count++;
      await markJobProgress(jobId, i + 1, safeRows.length, `Importando ${i + 1}/${safeRows.length}`);
    }
    await markJobCompleted(jobId, { count, skipped, total: safeRows.length }, `Importados ${count}, pulados ${skipped}`);
    revalidatePath("/contracts");
  } catch (e) { await markJobFailed(jobId, e instanceof Error ? e.message : String(e)); }
}

export async function startSyncGoogleIntegrationJobAction() {
  const user = await getUser();
  const job = await createBackgroundJob(user.id, "google_sync", "Sincronizar Google Agenda");
  after(() => runSyncGoogleIntegration(job.id, user.id));
  return { jobId: job.id };
}

export async function startImportClientsJobAction(rows: any[]) {
  const user = await getUser();
  const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
  const job = await createBackgroundJob(user.id, "import_clients", "Importar clientes", safeRows.length);
  after(() => runImportClients(job.id, user.id, user.role, safeRows));
  return { jobId: job.id };
}

export async function startImportContractsJobAction(rows: any[]) {
  const user = await getUser();
  const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
  const job = await createBackgroundJob(user.id, "import_contracts", "Importar contratos", safeRows.length);
  after(() => runImportContracts(job.id, user.id, user.role, safeRows));
  return { jobId: job.id };
}
