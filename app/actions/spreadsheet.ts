"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createBackgroundJob, markJobCompleted, markJobFailed, markJobProgress, markJobRunning } from "@/lib/background-jobs";
import {
  type SheetMatrices,
  normalizeName,
  parseClients,
  parseContracts,
  parseEvents,
} from "@/lib/spreadsheet";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return { id: session.user.id as string, role: (session.user as { role?: string }).role };
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== null && item !== undefined) result[key] = item;
  }
  return result as Partial<T>;
}

function contractStatusFromDates(endDate: Date, cancelled: boolean): "active" | "near_expiry" | "expired" {
  if (cancelled) return "expired";
  const days = Math.round((endDate.getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "near_expiry";
  return "active";
}

async function runImportWorkbook(jobId: string, userId: string, sheets: SheetMatrices) {
  try {
    const parsedClients = parseClients(sheets);
    const parsedContracts = parseContracts(sheets);
    const parsedEvents = parseEvents(sheets);
    const total = parsedClients.length + parsedContracts.length + parsedEvents.length;

    await markJobRunning(jobId, total);
    let processed = 0;
    let clientsCreated = 0;
    let clientsUpdated = 0;
    let contractsCreated = 0;
    let contractsUpdated = 0;
    let eventsCreated = 0;
    let eventsSkipped = 0;

    const existingClients = await prisma.client.findMany({ where: { userId, deletedAt: null } });
    const clientMap = new Map(existingClients.map((client) => [normalizeName(client.name), client]));

    for (const client of parsedClients) {
      const key = normalizeName(client.name);
      const existing = clientMap.get(key);
      const data = {
        name: client.name,
        legalName: client.legalName,
        tradeName: client.tradeName,
        cnpj: client.cnpj,
        address: client.address,
        phone: client.phone,
        email: client.email,
        contactName: client.contactName,
        contactRole: client.contactRole,
        responsible: client.responsible,
        offeredMediaType: client.offeredMediaType,
        lastContactAt: client.lastContactAt,
        nextAction: client.nextAction,
        contactFrequencyDays: client.contactFrequencyDays,
        nextActionDate: client.nextActionDate,
        commercialStatus: client.commercialStatus,
        contactType: client.contactType,
        contractValue: client.contractValue,
        notes: client.notes,
        contractStatus: client.contractStatus,
      };

      if (existing) {
        await prisma.client.update({ where: { id: existing.id }, data: compact(data) });
        clientsUpdated++;
      } else {
        const created = await prisma.client.create({
          data: { userId, vendorId: userId, videoWeekday: 0, ...data },
        });
        clientMap.set(key, created);
        clientsCreated++;
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Clientes ${processed}/${total}`);
    }

    const clientIds = Array.from(clientMap.values()).map((client) => client.id);
    const existingHistories = clientIds.length
      ? await prisma.contactHistory.findMany({ where: { clientId: { in: clientIds } }, select: { clientId: true } })
      : [];
    const historyClientIds = new Set(existingHistories.map((history) => history.clientId));
    for (const client of parsedClients) {
      if (!client.notes) continue;
      const stored = clientMap.get(normalizeName(client.name));
      if (!stored || historyClientIds.has(stored.id)) continue;
      await prisma.contactHistory.create({
        data: {
          clientId: stored.id,
          vendorId: userId,
          date: client.lastContactAt ?? new Date(),
          summary: client.notes,
        },
      });
      historyClientIds.add(stored.id);
    }

    const existingContracts = await prisma.contract.findMany({ where: { vendorId: userId, deletedAt: null } });
    const contractMap = new Map<string, (typeof existingContracts)[number]>();
    for (const contract of existingContracts) {
      const key = contract.number
        ? `${normalizeName(contract.number)}|${contract.clientId}`
        : `${contract.clientId}|${contract.startDate.toISOString().slice(0, 10)}|${normalizeName(contract.mediaType)}`;
      contractMap.set(key, contract);
    }

    for (const contract of parsedContracts) {
      let client = clientMap.get(normalizeName(contract.clientName));
      if (!client) {
        client = await prisma.client.create({
          data: {
            userId,
            vendorId: userId,
            name: contract.clientName,
            tradeName: contract.clientName,
            videoWeekday: 0,
            commercialStatus: "Contrato Fechado",
            contractStatus: "active",
          },
        });
        clientMap.set(normalizeName(contract.clientName), client);
      }

      const cancelled = normalizeName(`${contract.number ?? ""} ${contract.notes ?? ""}`).includes("cancel");
      const key = contract.number
        ? `${normalizeName(contract.number)}|${client.id}`
        : `${client.id}|${contract.startDate.toISOString().slice(0, 10)}|${normalizeName(contract.mediaType)}`;
      const existing = contractMap.get(key);
      const data = {
        number: contract.number,
        clientId: client.id,
        vendorId: userId,
        sellerName: contract.sellerName,
        program: contract.program,
        startDate: contract.startDate,
        durationMonths: contract.durationMonths,
        endDate: contract.endDate,
        mediaType: contract.mediaType,
        insertions: contract.insertionsPerMonth,
        insertionsPerDay: contract.insertionsPerDay,
        insertionsPerMonth: contract.insertionsPerMonth,
        timeSlots: contract.timeSlots,
        value: contract.value,
        totalValue: contract.totalValue,
        paymentInfo: contract.paymentInfo,
        status: contractStatusFromDates(contract.endDate, cancelled),
        notes: contract.notes,
      };

      if (existing) {
        await prisma.contract.update({ where: { id: existing.id }, data: compact(data) });
        contractsUpdated++;
      } else {
        const created = await prisma.contract.create({ data });
        contractMap.set(key, created);
        contractsCreated++;
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Contratos ${processed}/${total}`);
    }

    const existingEvents = await prisma.event.findMany({ where: { userId }, select: { clientId: true, start: true, title: true } });
    const eventKeys = new Set(
      existingEvents.map((event) => `${event.clientId ?? ""}|${event.start.toISOString().slice(0, 10)}|${normalizeName(event.title)}`)
    );

    for (const event of parsedEvents) {
      const client = event.clientName ? clientMap.get(normalizeName(event.clientName)) : undefined;
      const key = `${client?.id ?? ""}|${event.start.toISOString().slice(0, 10)}|${normalizeName(event.title)}`;
      if (eventKeys.has(key)) {
        eventsSkipped++;
        processed++;
        await markJobProgress(jobId, processed, total, `Agenda ${processed}/${total}`);
        continue;
      }
      await prisma.event.create({
        data: {
          userId,
          clientId: client?.id ?? null,
          title: event.title,
          description: event.description,
          start: event.start,
          allDay: true,
          type: event.type,
        },
      });
      eventKeys.add(key);
      eventsCreated++;
      processed++;
      await markJobProgress(jobId, processed, total, `Agenda ${processed}/${total}`);
    }

    const message = `${clientsCreated} cliente(s) novo(s), ${clientsUpdated} atualizado(s) • ${contractsCreated} contrato(s) novo(s), ${contractsUpdated} atualizado(s) • ${eventsCreated} evento(s)`;
    await markJobCompleted(
      jobId,
      { clientsCreated, clientsUpdated, contractsCreated, contractsUpdated, eventsCreated, eventsSkipped, total },
      message
    );
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    revalidatePath("/contracts");
    revalidatePath("/calendar");
    revalidatePath("/spreadsheet");
  } catch (error) {
    await markJobFailed(jobId, error instanceof Error ? error.message : String(error));
  }
}

export async function startImportWorkbookJobAction(sheets: SheetMatrices) {
  const user = await getUser();
  if (!sheets || typeof sheets !== "object") throw new Error("Planilha inválida");
  const job = await createBackgroundJob(user.id, "import_workbook", "Importar planilha completa");
  after(() => runImportWorkbook(job.id, user.id, sheets));
  return { jobId: job.id };
}

export async function getWorkbookExportDataAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;

  const clientWhere = role === "admin" ? { deletedAt: null } : { deletedAt: null, OR: [{ userId }, { vendorId: userId }] };
  const contractWhere = role === "admin" ? { deletedAt: null } : { deletedAt: null, vendorId: userId };

  const [clients, contracts, events] = await Promise.all([
    prisma.client.findMany({ where: clientWhere, orderBy: { name: "asc" } }),
    prisma.contract.findMany({ where: contractWhere, include: { client: true, vendor: true }, orderBy: { endDate: "asc" } }),
    prisma.event.findMany({
      where: role === "admin" ? {} : { userId },
      include: { client: true },
      orderBy: { start: "asc" },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      legalName: client.legalName,
      tradeName: client.tradeName,
      cnpj: client.cnpj,
      address: client.address,
      phone: client.phone,
      email: client.email,
      contactName: client.contactName,
      contactRole: client.contactRole,
      responsible: client.responsible,
      offeredMediaType: client.offeredMediaType,
      lastContactAt: client.lastContactAt?.toISOString() ?? null,
      nextAction: client.nextAction,
      contactFrequencyDays: client.contactFrequencyDays,
      nextActionDate: client.nextActionDate?.toISOString() ?? null,
      commercialStatus: client.commercialStatus,
      contactType: client.contactType,
      contractValue: client.contractValue,
      notes: client.notes,
      contractStatus: client.contractStatus,
    })),
    contracts: contracts.map((contract) => ({
      id: contract.id,
      number: contract.number,
      clientName: contract.client?.name ?? "",
      sellerName: contract.sellerName ?? contract.vendor?.name ?? "",
      program: contract.program,
      startDate: contract.startDate.toISOString(),
      durationMonths: contract.durationMonths,
      endDate: contract.endDate.toISOString(),
      mediaType: contract.mediaType,
      insertionsPerDay: contract.insertionsPerDay,
      insertionsPerMonth: contract.insertionsPerMonth ?? contract.insertions,
      timeSlots: contract.timeSlots,
      value: contract.value,
      totalValue: contract.totalValue,
      paymentInfo: contract.paymentInfo,
      status: contract.status,
      notes: contract.notes,
    })),
    events: events.map((event) => ({
      id: event.id,
      start: event.start.toISOString(),
      type: event.type,
      title: event.title,
      clientName: event.client?.name ?? null,
      description: event.description,
      allDay: event.allDay,
    })),
  };
}

export type WorkbookExportData = Awaited<ReturnType<typeof getWorkbookExportDataAction>>;
