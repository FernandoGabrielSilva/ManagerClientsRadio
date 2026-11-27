"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { clientSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureClientContactEventsForUser, deleteEventsForClients } from "./events";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function createClientAction(data: z.infer<typeof clientSchema>) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  const client = await prisma.client.create({
    data: {
      userId,
      vendorId: d.vendorId || null,
      name: d.name,
      company: d.company ?? null,
      legalName: d.legalName ?? null,
      tradeName: d.tradeName ?? null,
      cnpj: d.cnpj ?? null,
      address: d.address ?? null,
      phone: d.phone ?? null,
      email: d.email || null,
      contactName: d.contactName ?? null,
      contactPhone: d.contactPhone ?? null,
      contactEmail: d.contactEmail || null,
      contactRole: d.contactRole ?? null,
      offeredMediaType: d.offeredMediaType ?? null,
      videoWeekday: d.videoWeekday,
      lastContactAt: d.lastContactAt ? new Date(d.lastContactAt) : null,
      contactFrequencyDays: d.contactFrequencyDays,
      contractStatus: d.contractStatus,
      contractStart: d.contractStart ? new Date(d.contractStart) : null,
      contractEnd: d.contractEnd ? new Date(d.contractEnd) : null,
      contractValue: d.contractValue ?? null,
      contractTotalValue: d.contractTotalValue ?? null,
      notes: d.notes ?? null,
      lastVideoSentAt: d.lastVideoSentAt ? new Date(d.lastVideoSentAt) : null,
      needsAdChange: d.needsAdChange ?? false,
      responsible: d.responsible ?? null,
      commercialStatus: d.commercialStatus ?? null,
      contactType: d.contactType ?? null,
      nextAction: d.nextAction ?? null,
      nextActionDate: d.nextActionDate ? new Date(d.nextActionDate) : null,
      dateConference: d.dateConference ? new Date(d.dateConference) : null,
    },
  });
  await ensureClientContactEventsForUser(userId, role);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateClientAction(id: string, data: z.infer<typeof clientSchema>) {
  const userId = await getUserId();
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.client.update({
    where: { id, userId },
    data: {
      name: d.name,
      company: d.company ?? null,
      legalName: d.legalName ?? null,
      tradeName: d.tradeName ?? null,
      cnpj: d.cnpj ?? null,
      address: d.address ?? null,
      phone: d.phone ?? null,
      email: d.email || null,
      contactName: d.contactName ?? null,
      contactPhone: d.contactPhone ?? null,
      contactEmail: d.contactEmail || null,
      contactRole: d.contactRole ?? null,
      offeredMediaType: d.offeredMediaType ?? null,
      videoWeekday: d.videoWeekday,
      lastContactAt: d.lastContactAt ? new Date(d.lastContactAt) : null,
      contactFrequencyDays: d.contactFrequencyDays,
      contractStatus: d.contractStatus,
      contractStart: d.contractStart ? new Date(d.contractStart) : null,
      contractEnd: d.contractEnd ? new Date(d.contractEnd) : null,
      contractValue: d.contractValue ?? null,
      contractTotalValue: d.contractTotalValue ?? null,
      notes: d.notes ?? null,
      lastVideoSentAt: d.lastVideoSentAt ? new Date(d.lastVideoSentAt) : null,
      needsAdChange: d.needsAdChange ?? false,
      vendorId: d.vendorId || null,
      responsible: d.responsible ?? null,
      commercialStatus: d.commercialStatus ?? null,
      contactType: d.contactType ?? null,
      nextAction: d.nextAction ?? null,
      nextActionDate: d.nextActionDate ? new Date(d.nextActionDate) : null,
      dateConference: d.dateConference ? new Date(d.dateConference) : null,
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteClientAction(id: string) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ClientWhereInput = { id };
  if (role !== "admin") where.OR = [{ userId }, { vendorId: userId }];
  await prisma.client.updateMany({ where, data: { deletedAt: new Date(), archivedAt: null } });
  await deleteEventsForClients(userId, [id]);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveClientsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ClientWhereInput = { id: { in: ids } };
  if (role !== "admin") where.OR = [{ userId }, { vendorId: userId }];
  await prisma.client.updateMany({ where, data: { archivedAt: new Date(), deletedAt: null } });
  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClientsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ClientWhereInput = { id: { in: ids } };
  if (role !== "admin") where.OR = [{ userId }, { vendorId: userId }];
  await prisma.client.updateMany({ where, data: { deletedAt: new Date(), archivedAt: null } });
  await deleteEventsForClients(userId, ids);
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function restoreClientsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ClientWhereInput = { id: { in: ids } };
  if (role !== "admin") where.OR = [{ userId }, { vendorId: userId }];
  const toRestore = await prisma.client.findMany({ where: { ...where, deletedAt: { not: null } } });
  for (const c of toRestore) {
    const dup = await prisma.client.findFirst({ where: { userId, deletedAt: null, name: c.name } });
    if (dup) continue;
    await prisma.client.update({ where: { id: c.id }, data: { archivedAt: null, deletedAt: null } });
  }
  await ensureClientContactEventsForUser(userId, role);
  revalidatePath("/clients");
  return { success: true };
}

export async function unarchiveClientsAction(ids: string[]) {
  return restoreClientsAction(ids);
}

export async function permanentDeleteClientsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ClientWhereInput = { id: { in: ids } };
  if (role !== "admin") where.OR = [{ userId }, { vendorId: userId }];
  await deleteEventsForClients(userId, ids);
  await prisma.client.deleteMany({ where });
  revalidatePath("/clients");
  return { success: true };
}

export async function markContactedAction(id: string) {
  const userId = await getUserId();
  await prisma.client.update({
    where: { id, userId },
    data: { lastContactAt: new Date(), needsAdChange: true },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markVideoSentAction(id: string) {
  const userId = await getUserId();
  await prisma.client.update({
    where: { id, userId },
    data: { lastVideoSentAt: new Date() },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function toggleAdChangeAction(id: string, value: boolean) {
  const userId = await getUserId();
  await prisma.client.update({
    where: { id, userId },
    data: { needsAdChange: value },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}


function toDateValue(v: any): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}


function toNumberValue(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9,.-]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

export async function getActiveClientsAction() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const where = role === "admin" ? { deletedAt: null, archivedAt: null } : { deletedAt: null, archivedAt: null, OR: [{ userId }, { vendorId: userId }] };
  const clients = await prisma.client.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return clients;
}

export async function getAllClientsForExportAction() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const where = role === "admin" ? {} : { OR: [{ userId }, { vendorId: userId }] };
  const clients = await prisma.client.findMany({ where, orderBy: { name: "asc" }, include: { vendor: true } });
  return clients.map((c) => ({
    name: c.name,
    legalName: c.legalName,
    tradeName: c.tradeName,
    cnpj: c.cnpj,
    address: c.address,
    responsible: c.responsible,
    contactName: c.contactName,
    contactRole: c.contactRole,
    phone: c.phone,
    email: c.email,
    commercialStatus: c.commercialStatus ?? c.contractStatus,
    offeredMediaType: c.offeredMediaType,
    contractValue: c.contractValue,
    contractTotalValue: c.contractTotalValue,
    lastContactAt: c.lastContactAt?.toISOString() ?? null,
    contactType: c.contactType,
    nextAction: c.nextAction,
    nextActionDate: c.nextActionDate?.toISOString() ?? null,
    contactFrequencyDays: c.contactFrequencyDays,
    notes: c.notes,
    dateConference: c.dateConference?.toISOString() ?? null,
    videoWeekday: c.videoWeekday,
    contractStatus: c.contractStatus,
  }));
}

function normImportText(v: unknown) { return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase(); }
function normImportDate(v: unknown) { const d = toDateValue(v); return d ? d.toISOString().slice(0, 10) : ""; }
function normImportNum(v: unknown) { const n = toNumberValue(v); return n == null ? "" : String(n); }

function clientImportKey(r: Record<string, any>) {
  const contractStatus = (["active", "paused", "ended", "negotiation"].includes(String(r.contractStatus)) ? String(r.contractStatus) : "active");
  return [
    normImportText(r.name ?? r["Cliente / anunciante"] ?? r.Nome ?? "Sem nome"),
    normImportText(r.responsible ?? r["Responsável"]),
    normImportText(r.contactName ?? r["Contato / decisor"] ?? r.Contato),
    normImportText(r.phone ?? r.WhatsApp ?? r.Telefone),
    normImportText(r.email ?? r.Email),
    normImportText(r.commercialStatus ?? r["Situação comercial"]),
    normImportNum(r.contractValue ?? r["Valor proposto (R$)"]),
    normImportDate(r.lastContactAt ?? r["Último contato"]),
    normImportText(r.contactType ?? r["Tipo de contato"]),
    normImportText(r.nextAction ?? r["Próxima ação"]),
    normImportDate(r.nextActionDate ?? r["Data próxima ação"]),
    normImportText(r.notes ?? r["Histórico / observações"] ?? r.Observações),
    normImportDate(r.dateConference ?? r["Conferência de datas"]),
    String(Math.max(0, Math.min(127, Number(r.videoWeekday ?? r["Dias Vídeo"] ?? 1) || 1))),
    String(Math.max(1, Math.min(365, Number(r.contactFrequencyDays ?? 14) || 14))),
    contractStatus,
  ].join("|");
}

function existingClientKey(c: any) {
  return [
    normImportText(c.name),
    normImportText(c.responsible),
    normImportText(c.contactName),
    normImportText(c.phone),
    normImportText(c.email),
    normImportText(c.commercialStatus),
    normImportNum(c.contractValue),
    normImportDate(c.lastContactAt),
    normImportText(c.contactType),
    normImportText(c.nextAction),
    normImportDate(c.nextActionDate),
    normImportText(c.notes),
    normImportDate(c.dateConference),
    String(Math.max(0, Math.min(127, Number(c.videoWeekday ?? 1) || 1))),
    String(Math.max(1, Math.min(365, Number(c.contactFrequencyDays ?? 14) || 14))),
    String(c.contractStatus ?? "active"),
  ].join("|");
}

export async function importClientsAction(rows: any[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as any).role;
  const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
  const existing = await prisma.client.findMany({ where: { userId, deletedAt: null } });
  const seen = new Set(existing.map(existingClientKey));
  let count = 0;
  let skipped = 0;
  for (const r of safeRows) {
    if (!r || typeof r !== "object") { skipped++; continue; }
    const key = clientImportKey(r);
    if (seen.has(key)) { skipped++; continue; }
    const name = String(r.name ?? r["Nome Fantasia / Cliente"] ?? r["Cliente / anunciante"] ?? r.Nome ?? "Sem nome").slice(0, 200);
    await prisma.client.create({
      data: {
        userId,
        vendorId: userId,
        name,
        legalName: r.legalName ?? r["Razão Social"] ?? null,
        tradeName: r.tradeName ?? r["Nome Fantasia / Cliente"] ?? null,
        cnpj: r.cnpj ?? r["CNPJ / CPF"] ?? null,
        address: r.address ?? r["Endereço Completo"] ?? null,
        phone: r.phone ?? r["Telefone / WhatsApp"] ?? r.WhatsApp ?? r.Telefone ?? null,
        email: r.email ?? r.Email ?? null,
        contactName: r.contactName ?? r["Contato Responsável"] ?? r["Contato / decisor"] ?? r.Contato ?? null,
        contactRole: r.contactRole ?? r["Cargo / Setor"] ?? null,
        offeredMediaType: r.offeredMediaType ?? r["Tipo de Mídia Ofertada"] ?? null,
        videoWeekday: Math.max(0, Math.min(127, Number(r.videoWeekday ?? r["Dias Vídeo"] ?? 1) || 1)),
        contactFrequencyDays: Math.max(1, Math.min(365, Number(r.contactFrequencyDays ?? r["Prazo Retorno (Dias)"] ?? 14) || 14)),
        contractStatus: (["active","paused","ended","negotiation"].includes(String(r.contractStatus)) ? r.contractStatus : "active") as any,
        notes: r.notes ?? r["Histórico de Contatos / Detalhes do PI"] ?? r["Histórico / observações"] ?? r.Observações ?? null,
        responsible: r.responsible ?? r["Vendedor / Representante"] ?? r["Responsável"] ?? null,
        commercialStatus: r.commercialStatus ?? r["Situação Comercial"] ?? r["Situação comercial"] ?? null,
        contactType: r.contactType ?? r["Tipo de Contato"] ?? r["Tipo de contato"] ?? null,
        nextAction: r.nextAction ?? r["Próxima Ação"] ?? r["Próxima ação"] ?? null,
        nextActionDate: toDateValue(r.nextActionDate ?? r["Data Próximo Retorno (Auto)"] ?? r["Data próxima ação"]),
        dateConference: toDateValue(r.dateConference ?? r["Conferência de datas"]),
        contractValue: toNumberValue(r.contractValue ?? r["Valor mensal (R$)"] ?? r["Valor Proposto (R$)"] ?? r["Valor proposto (R$)"]),
        contractTotalValue: toNumberValue(r.contractTotalValue ?? r["Valor total (R$)"]),
        lastContactAt: toDateValue(r.lastContactAt ?? r["Data Último Contato"] ?? r["Último contato"]),
      },
    });
    seen.add(key);
    count++;
  }
  await ensureClientContactEventsForUser(userId, role);
  revalidatePath("/clients");
  return { success: true, count, skipped, total: safeRows.length };
}
