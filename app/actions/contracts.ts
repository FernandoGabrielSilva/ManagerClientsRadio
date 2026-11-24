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
  await prisma.contract.create({
    data: {
      number: d.number ?? null,
      clientId: d.clientId,
      vendorId: role === "admin" ? (d.vendorId || userId) : userId,
      sellerName: d.sellerName?.trim() || null,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      mediaType: d.mediaType,
      insertions: d.insertions ?? null,
      timeSlots: d.timeSlots ?? null,
      value: d.value ?? null,
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
  await prisma.contract.updateMany({ where, data: { archivedAt: null, deletedAt: null } });
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
    mediaType: c.mediaType,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    insertions: c.insertions,
    timeSlots: c.timeSlots,
    value: c.value,
    status: c.status,
  }));
}

function normImportText(v: unknown) { return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase(); }
function normImportDate(v: unknown) { const d = v instanceof Date ? v : new Date(String(v ?? "")); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
function normImportNum(v: unknown) { const n = Number(String(v ?? "").replace(/[^0-9,.-]/g, "").replace(",", ".")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? String(n) : ""; }

function contractImportKey(r: Record<string, any>, clientId: string) {
  const mediaType = (["spot", "sponsorship", "testimonial", "other"].includes(String(r.mediaType)) ? String(r.mediaType) : "spot");
  return [
    clientId,
    normImportText(r.number ?? r.Número),
    normImportText(r.sellerName ?? r["Vendedor"]),
    mediaType,
    normImportDate(r.startDate ?? r["Data Início"]),
    normImportDate(r.endDate ?? r["Data Término"]),
    normImportNum(r.insertions ?? r.Inserções),
    normImportText(r.timeSlots ?? r.Horários),
    normImportNum(r.value ?? r.Valor),
    normImportText(r.notes ?? r.Observações),
  ].join("|");
}

function existingContractKey(c: any) {
  return [
    String(c.clientId),
    normImportText(c.number),
    normImportText(c.sellerName),
    String(c.mediaType ?? "spot"),
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
  const existingWhere: Prisma.ContractWhereInput = role === "admin" ? {} : { vendorId: userId };
  const existing = await prisma.contract.findMany({ where: existingWhere });
  const seen = new Set(existing.map(existingContractKey));
  let count = 0;
  let skipped = 0;
  for (const r of safeRows) {
    if (!r || typeof r !== "object") { skipped++; continue; }
    const clientName = String(r.client ?? r.Cliente ?? "").trim();
    if (!clientName) { skipped++; continue; }
    const clientWhere: Prisma.ClientWhereInput = { name: clientName };
    if (role !== "admin") clientWhere.OR = [{ userId }, { vendorId: userId }];
    const client = await prisma.client.findFirst({ where: clientWhere, select: { id: true } });
    if (!client) { skipped++; continue; }
    const key = contractImportKey(r, client.id);
    if (seen.has(key)) { skipped++; continue; }
    const start = new Date(r.startDate ?? r["Data Início"] ?? new Date());
    const end = new Date(r.endDate ?? r["Data Término"] ?? new Date());
    await prisma.contract.create({
      data: {
        number: r.number ?? r.Número ?? null,
        clientId: client.id,
        vendorId: userId,
        sellerName: r.sellerName ?? r["Vendedor"] ?? null,
        startDate: Number.isNaN(start.getTime()) ? new Date() : start,
        endDate: Number.isNaN(end.getTime()) ? new Date() : end,
        mediaType: (["spot", "sponsorship", "testimonial", "other"].includes(String(r.mediaType)) ? String(r.mediaType) : "spot") as "spot" | "sponsorship" | "testimonial" | "other",
        insertions: r.insertions ? Number(r.insertions) : null,
        timeSlots: r.timeSlots ?? r.Horários ?? null,
        value: r.value ? Number(r.value) : null,
        notes: r.notes ?? null,
      },
    });
    seen.add(key);
    count++;
  }
  revalidatePath("/contracts");
  return { success: true, count, skipped, total: safeRows.length };
}
