"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { contractSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function createContractAction(data: z.infer<typeof contractSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const parsed = contractSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  const clientWhere: Prisma.ClientWhereInput = { id: d.clientId };
  if (role !== "admin") clientWhere.OR = [{ userId }, { vendorId: userId }];
  const client = await prisma.client.findFirst({ where: clientWhere, select: { id: true } });
  if (!client) return { error: "Cliente não encontrado" };
  const startDate = new Date(d.startDate);
  const endDate = d.endDate
    ? new Date(d.endDate)
    : new Date(startDate.getFullYear(), startDate.getMonth() + (d.durationMonths ?? 1), startDate.getDate());
  const days = Math.floor((endDate.getTime() - Date.now()) / 86400000);
  await prisma.contract.create({
    data: {
      number: d.number?.trim() || null,
      clientId: d.clientId,
      vendorId: role === "admin" ? (d.vendorId || userId) : userId,
      sellerName: d.sellerName?.trim() || null,
      program: d.program?.trim() || null,
      startDate,
      durationMonths: d.durationMonths ?? null,
      endDate,
      mediaType: d.mediaType?.trim() || "Spot 30s",
      insertions: d.insertions ?? d.insertionsPerMonth ?? null,
      insertionsPerDay: d.insertionsPerDay ?? null,
      insertionsPerMonth: d.insertionsPerMonth ?? null,
      timeSlots: d.timeSlots ?? null,
      value: d.value ?? null,
      totalValue: d.totalValue ?? null,
      paymentInfo: d.paymentInfo ?? null,
      status: days < 0 ? "expired" : days <= 30 ? "near_expiry" : "active",
      notes: d.notes ?? null,
    },
  });
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateContractPdfAction(id: string, pdfBase64: string, pdfName: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const where: Prisma.ContractWhereInput = { id };
  if (role !== "admin") where.vendorId = userId;
  const result = await prisma.contract.updateMany({
    where,
    data: { pdfData: Buffer.from(pdfBase64, "base64"), pdfName },
  });
  if (result.count === 0) return { error: "Contrato não encontrado" };
  revalidatePath("/contracts");
  revalidatePath(`/contracts/${id}`);
  return { success: true };
}

export async function deleteContractAction(id: string) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ContractWhereInput = { id };
  if (role !== "admin") where.vendorId = userId;
  await prisma.contract.updateMany({ where, data: { deletedAt: new Date(), archivedAt: null } });
  revalidatePath("/contracts");
  return { success: true };
}

export async function archiveContractsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ContractWhereInput = { id: { in: ids } };
  if (role !== "admin") where.vendorId = userId;
  await prisma.contract.updateMany({ where, data: { archivedAt: new Date(), deletedAt: null } });
  revalidatePath("/contracts");
  return { success: true };
}

export async function deleteContractsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ContractWhereInput = { id: { in: ids } };
  if (role !== "admin") where.vendorId = userId;
  await prisma.contract.updateMany({ where, data: { deletedAt: new Date(), archivedAt: null } });
  revalidatePath("/contracts");
  return { success: true };
}

export async function restoreContractsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ContractWhereInput = { id: { in: ids } };
  if (role !== "admin") where.vendorId = userId;
  const toRestore = await prisma.contract.findMany({ where: { ...where, deletedAt: { not: null } } });
  for (const c of toRestore) {
    const dup = await prisma.contract.findFirst({ where: { vendorId: userId, deletedAt: null, number: c.number, clientId: c.clientId } });
    if (dup) continue;
    await prisma.contract.update({ where: { id: c.id }, data: { archivedAt: null, deletedAt: null } });
  }
  revalidatePath("/contracts");
  return { success: true };
}

export async function permanentDeleteContractsAction(ids: string[]) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as any).role;
  const where: Prisma.ContractWhereInput = { id: { in: ids } };
  if (role !== "admin") where.vendorId = userId;
  await prisma.contract.deleteMany({ where });
  revalidatePath("/contracts");
  return { success: true };
}

export async function addContactHistoryAction(clientId: string, summary: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const clientWhere: Prisma.ClientWhereInput = { id: clientId };
  if (role !== "admin") clientWhere.OR = [{ userId }, { vendorId: userId }];
  const client = await prisma.client.findFirst({ where: clientWhere, select: { id: true } });
  if (!client) return { error: "Cliente não encontrado" };
  await prisma.contactHistory.create({
    data: { clientId, vendorId: userId, summary },
  });
  await prisma.client.update({ where: { id: clientId }, data: { lastContactAt: new Date() } });
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function getAllContractsForExportAction() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  const where = role === "admin" ? {} : { vendorId: userId };
  const contracts = await prisma.contract.findMany({ where, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } });
  return contracts.map((c) => ({
    number: c.number,
    clientName: c.client?.name ?? "",
    sellerName: c.sellerName ?? c.vendor?.name ?? "",
    program: c.program,
    mediaType: c.mediaType,
    startDate: c.startDate?.toISOString() ?? null,
    durationMonths: c.durationMonths,
    endDate: c.endDate?.toISOString() ?? null,
    insertions: c.insertions,
    insertionsPerDay: c.insertionsPerDay,
    insertionsPerMonth: c.insertionsPerMonth,
    timeSlots: c.timeSlots,
    value: c.value,
    totalValue: c.totalValue,
    paymentInfo: c.paymentInfo,
    status: c.status,
    notes: c.notes,
  }));
}

function normImportText(v: unknown) { return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase(); }
function normImportDate(v: unknown) { const d = v instanceof Date ? v : new Date(String(v ?? "")); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
function normImportNum(v: unknown) { const n = Number(String(v ?? "").replace(/[^0-9,.-]/g, "").replace(",", ".")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? String(n) : ""; }

function contractImportKey(r: Record<string, any>, clientId: string) {
  return [
    clientId,
    normImportText(r.number ?? r["Nº Contrato / PI"] ?? r.Número),
    normImportText(r.sellerName ?? r["Vendedor Responsável"] ?? r["Vendedor"]),
    normImportText(r.mediaType ?? r["Tipo de Mídia"] ?? "Spot 30s"),
    normImportDate(r.startDate ?? r["Data de Início"] ?? r["Data Início"]),
    normImportDate(r.endDate ?? r["Data de Término (Auto)"] ?? r["Data Término"]),
    normImportNum(r.insertions ?? r.insertionsPerMonth ?? r["Total Inserções / Mês"] ?? r.Inserções),
    normImportText(r.timeSlots ?? r["Horários de Veiculação"] ?? r.Horários),
    normImportNum(r.value ?? r["Valor Mensal (R$)"] ?? r.Valor),
    normImportText(r.notes ?? r["Observações de Veiculação"] ?? r.Observações),
  ].join("|");
}

function existingContractKey(c: any) {
  return [
    String(c.clientId),
    normImportText(c.number),
    normImportText(c.sellerName),
    normImportText(c.mediaType ?? "Spot 30s"),
    normImportDate(c.startDate),
    normImportDate(c.endDate),
    normImportNum(c.insertions),
    normImportText(c.timeSlots),
    normImportNum(c.value),
    normImportText(c.notes),
  ].join("|");
}

export async function importContractsAction(rows: any[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const safeRows = Array.isArray(rows) ? rows.slice(0, 500) : [];
  const existingWhere: Prisma.ContractWhereInput = role === "admin" ? { deletedAt: null } : { vendorId: userId, deletedAt: null };
  const existing = await prisma.contract.findMany({ where: existingWhere });
  const seen = new Set(existing.map(existingContractKey));
  let count = 0;
  let skipped = 0;
  for (const r of safeRows) {
    if (!r || typeof r !== "object") { skipped++; continue; }
    const clientName = String(r.client ?? r["Cliente / Anunciante"] ?? r.Cliente ?? "").trim();
    if (!clientName) { skipped++; continue; }
    const clientWhere: Prisma.ClientWhereInput = { name: clientName };
    if (role !== "admin") clientWhere.OR = [{ userId }, { vendorId: userId }];
    const client = await prisma.client.findFirst({ where: clientWhere, select: { id: true } });
    if (!client) { skipped++; continue; }
    const key = contractImportKey(r, client.id);
    if (seen.has(key)) { skipped++; continue; }
    const start = new Date(r.startDate ?? r["Data de Início"] ?? r["Data Início"] ?? new Date());
    const duration = Number(r.durationMonths ?? r["Duração (Meses)"] ?? 0) || null;
    const endRaw = r.endDate ?? r["Data de Término (Auto)"] ?? r["Data Término"];
    const end = endRaw ? new Date(endRaw) : new Date(start.getFullYear(), start.getMonth() + (duration ?? 1), start.getDate());
    const endDate = Number.isNaN(end.getTime()) ? start : end;
    const days = Math.floor((endDate.getTime() - Date.now()) / 86400000);
    await prisma.contract.create({
      data: {
        number: r.number ?? r["Nº Contrato / PI"] ?? r.Número ?? null,
        clientId: client.id,
        vendorId: userId,
        sellerName: r.sellerName ?? r["Vendedor Responsável"] ?? r["Vendedor"] ?? null,
        program: r.program ?? r["Programa / Faixa"] ?? null,
        startDate: Number.isNaN(start.getTime()) ? new Date() : start,
        durationMonths: duration,
        endDate,
        mediaType: String(r.mediaType ?? r["Tipo de Mídia"] ?? "Spot 30s"),
        insertions: r.insertions ? Number(r.insertions) : (r.insertionsPerMonth ? Number(r.insertionsPerMonth) : null),
        insertionsPerDay: r.insertionsPerDay ? Number(r.insertionsPerDay) : (r["Qtd. Inserções / Dia"] ? Number(r["Qtd. Inserções / Dia"]) : null),
        insertionsPerMonth: r.insertionsPerMonth ? Number(r.insertionsPerMonth) : (r["Total Inserções / Mês"] ? Number(r["Total Inserções / Mês"]) : null),
        timeSlots: r.timeSlots ?? r["Horários de Veiculação"] ?? r.Horários ?? null,
        value: r.value ? Number(r.value) : (r["Valor Mensal (R$)"] ? Number(r["Valor Mensal (R$)"]) : null),
        totalValue: r.totalValue ? Number(r.totalValue) : (r["Valor Total / Valor Bruto"] ? Number(r["Valor Total / Valor Bruto"]) : null),
        paymentInfo: r.paymentInfo ?? r["Pagamento / Vencimento"] ?? null,
        status: days < 0 ? "expired" : days <= 30 ? "near_expiry" : "active",
        notes: r.notes ?? r["Observações de Veiculação"] ?? null,
      },
    });
    seen.add(key);
    count++;
  }
  revalidatePath("/contracts");
  return { success: true, count, skipped, total: safeRows.length };
}
