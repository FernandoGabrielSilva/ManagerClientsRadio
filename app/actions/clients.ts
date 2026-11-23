"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { clientSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function createClientAction(data: z.infer<typeof clientSchema>) {
  const userId = await getUserId();
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.client.create({
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
      videoWeekday: d.videoWeekday,
      lastContactAt: d.lastContactAt ? new Date(d.lastContactAt) : null,
      contactFrequencyDays: d.contactFrequencyDays,
      contractStatus: d.contractStatus,
      contractStart: d.contractStart ? new Date(d.contractStart) : null,
      contractEnd: d.contractEnd ? new Date(d.contractEnd) : null,
      contractValue: d.contractValue ?? null,
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
      videoWeekday: d.videoWeekday,
      lastContactAt: d.lastContactAt ? new Date(d.lastContactAt) : null,
      contactFrequencyDays: d.contactFrequencyDays,
      contractStatus: d.contractStatus,
      contractStart: d.contractStart ? new Date(d.contractStart) : null,
      contractEnd: d.contractEnd ? new Date(d.contractEnd) : null,
      contractValue: d.contractValue ?? null,
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
  await prisma.client.updateMany({ where, data: { archivedAt: null, deletedAt: null } });
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

export async function importClientsAction(rows: any[]) {
  const userId = await getUserId();
  let count = 0;
  for (const r of rows) {
    await prisma.client.create({
      data: {
        userId,
        vendorId: userId,
        name: String(r.name ?? r["Cliente / anunciante"] ?? r.Nome ?? "Sem nome"),
        phone: r.phone ?? r.WhatsApp ?? r.Telefone ?? null,
        email: r.email ?? r.Email ?? null,
        contactName: r.contactName ?? r["Contato / decisor"] ?? r.Contato ?? null,
        videoWeekday: Number(r.videoWeekday ?? r["Dias Vídeo"] ?? 1),
        contactFrequencyDays: Number(r.contactFrequencyDays ?? 14),
        contractStatus: (r.contractStatus ?? "active") as any,
        notes: r.notes ?? r["Histórico / observações"] ?? r.Observações ?? null,
        responsible: r.responsible ?? r["Responsável"] ?? null,
        commercialStatus: r.commercialStatus ?? r["Situação comercial"] ?? null,
        contactType: r.contactType ?? r["Tipo de contato"] ?? null,
        nextAction: r.nextAction ?? r["Próxima ação"] ?? null,
        nextActionDate: toDateValue(r.nextActionDate ?? r["Data próxima ação"]),
        dateConference: toDateValue(r.dateConference ?? r["Conferência de datas"]),
        contractValue: toNumberValue(r.contractValue ?? r["Valor proposto (R$)"]),
        lastContactAt: toDateValue(r.lastContactAt ?? r["Último contato"]),
      },
    });
    count++;
  }
  revalidatePath("/clients");
  return { success: true, count };
}
