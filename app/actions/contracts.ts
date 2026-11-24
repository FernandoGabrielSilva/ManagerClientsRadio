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
  const userId = await getUserId();
  const parsed = contractSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.contract.create({
    data: {
      number: d.number ?? null,
      clientId: d.clientId,
      vendorId: d.vendorId || userId,
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
  const userId = await getUserId();
  await prisma.contract.update({
    where: { id },
    data: { pdfData: Buffer.from(pdfBase64, "base64"), pdfName },
  });
  revalidatePath("/contracts");
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
  const userId = session!.user!.id as string;
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
    mediaType: c.mediaType,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    insertions: c.insertions,
    timeSlots: c.timeSlots,
    value: c.value,
    status: c.status,
  }));
}

export async function importContractsAction(rows: any[]) {
  const userId = await getUserId();
  let count = 0;
  for (const r of rows) {
    // find client by name
    const client = await prisma.client.findFirst({ where: { userId, name: String(r.client ?? r.Cliente ?? "") } });
    if (!client) continue;
    await prisma.contract.create({
      data: {
        number: r.number ?? r.Número ?? null,
        clientId: client.id,
        vendorId: userId,
        startDate: new Date(r.startDate ?? r["Data Início"] ?? new Date()),
        endDate: new Date(r.endDate ?? r["Data Término"] ?? new Date()),
        mediaType: (r.mediaType ?? "spot") as any,
        insertions: r.insertions ? Number(r.insertions) : null,
        timeSlots: r.timeSlots ?? r.Horários ?? null,
        value: r.value ? Number(r.value) : null,
        notes: r.notes ?? null,
      },
    });
    count++;
  }
  revalidatePath("/contracts");
  return { success: true, count };
}
