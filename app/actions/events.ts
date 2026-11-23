"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { eventSchema } from "@/lib/validators";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { formatDate, nextContactDate } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

async function getGoogleUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarConnected: true, autoCreateEvents: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
  });
}

async function pushEventToGoogle(userId: string, event: { id: string; title: string; description: string | null; start: Date; end: Date | null; allDay: boolean }, user?: Awaited<ReturnType<typeof getGoogleUser>>) {
  const u = user ?? await getGoogleUser(userId);
  if (!u?.googleCalendarConnected || !u.autoCreateEvents || !u.googleAccessToken) return;
  const calendarId = u.googleCalendarId || "primary";
  try {
    const gid = await createCalendarEvent(u.googleAccessToken, u.googleRefreshToken, calendarId, {
      title: event.title,
      description: event.description ?? undefined,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
    });
    if (gid) await prisma.event.update({ where: { id: event.id }, data: { googleEventId: gid } });
  } catch (e) {
    console.error("google push error", e);
  }
}

export async function syncPendingGoogleEventsForUser(userId: string) {
  const user = await getGoogleUser(userId);
  if (!user?.googleCalendarConnected || !user.autoCreateEvents || !user.googleAccessToken) return { pushed: 0 };
  const pending = await prisma.event.findMany({ where: { userId, googleEventId: null } });
  let pushed = 0;
  for (const ev of pending) {
    const before = ev.googleEventId;
    await pushEventToGoogle(userId, ev, user);
    const after = await prisma.event.findUnique({ where: { id: ev.id }, select: { googleEventId: true } });
    if (!before && after?.googleEventId) pushed++;
  }
  return { pushed };
}

export async function createEventAction(data: z.infer<typeof eventSchema>) {
  const userId = await getUserId();
  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  const event = await prisma.event.create({
    data: {
      userId,
      title: d.title,
      description: d.description ?? null,
      start: new Date(d.start),
      end: d.end ? new Date(d.end) : null,
      allDay: d.allDay ?? true,
      type: d.type,
      clientId: d.clientId || null,
    },
  });
  await pushEventToGoogle(userId, event);
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteEventAction(id: string) {
  const userId = await getUserId();
  const event = await prisma.event.findFirst({ where: { id, userId } });
  if (!event) return { error: "Evento não encontrado" };
  if (event.googleEventId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
    });
    if (user?.googleCalendarConnected && user.googleAccessToken) {
      try {
        await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, user.googleCalendarId || "primary", event.googleEventId);
      } catch (e) {
        console.error("google delete error", e);
      }
    }
  }
  await prisma.event.delete({ where: { id } });
  revalidatePath("/calendar");
  return { success: true };
}

export async function listEventsAction(start: string, end: string) {
  const userId = await getUserId();
  return prisma.event.findMany({
    where: { userId, start: { gte: new Date(start), lte: new Date(end) } },
    include: { client: true },
  });
}

export async function ensureClientContactEventsAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as any).role;
  return ensureClientContactEventsForUser(userId, role);
}

async function upsertAutoEvent(userId: string, key: { clientId: string; type: "contact" | "contract_expiry"; start: Date; titlePrefix: string }, data: { title: string; description: string; start: Date; end: Date }) {
  const existing = await prisma.event.findFirst({
    where: { userId, clientId: key.clientId, type: key.type, start: key.start, title: { startsWith: key.titlePrefix } },
  });
  if (existing) {
    if (existing.description !== data.description || existing.title !== data.title || existing.end?.getTime() !== data.end.getTime()) {
      await prisma.event.update({ where: { id: existing.id }, data: { title: data.title, description: data.description, end: data.end } });
    }
    return false;
  }
  const event = await prisma.event.create({
    data: { userId, clientId: key.clientId, type: key.type, title: data.title, description: data.description, start: data.start, end: data.end, allDay: true },
  });
  await pushEventToGoogle(userId, event);
  return true;
}

export async function ensureClientContactEventsForUser(userId: string, role?: string, opts?: { revalidate?: boolean }) {
  const where = role === "admin"
    ? { deletedAt: null, archivedAt: null }
    : { OR: [{ userId }, { vendorId: userId }], deletedAt: null, archivedAt: null };
  const clients = await prisma.client.findMany({
    where,
    select: { id: true, name: true, lastContactAt: true, contactFrequencyDays: true, contracts: { where: { deletedAt: null, archivedAt: null }, select: { id: true, number: true, endDate: true } } },
  });
  let created = 0;
  for (const c of clients) {
    if (c.lastContactAt) {
      const last = new Date(c.lastContactAt);
      const start = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
      if (await upsertAutoEvent(userId, { clientId: c.id, type: "contact", start, titlePrefix: "Último contato:" }, {
        title: `Último contato: ${c.name}`,
        description: `Último contato com ${c.name} em ${formatDate(start)}.`,
        start, end,
      })) created++;
    }

    const next = nextContactDate(c.lastContactAt ? new Date(c.lastContactAt) : null, c.contactFrequencyDays ?? 14);
    const nextStart = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()));
    const nextEnd = new Date(Date.UTC(nextStart.getUTCFullYear(), nextStart.getUTCMonth(), nextStart.getUTCDate() + 1));
    if (await upsertAutoEvent(userId, { clientId: c.id, type: "contact", start: nextStart, titlePrefix: "Próximo contato:" }, {
      title: `Próximo contato: ${c.name}`,
      description: `Próximo contato com ${c.name} em ${formatDate(nextStart)}.`,
      start: nextStart, end: nextEnd,
    })) created++;

    for (const ct of c.contracts) {
      const d = new Date(ct.endDate);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
      const label = ct.number ? `Contrato ${ct.number}` : "Contrato";
      if (await upsertAutoEvent(userId, { clientId: c.id, type: "contract_expiry", start, titlePrefix: `Vencimento ${label}:` }, {
        title: `Vencimento ${label}: ${c.name}`,
        description: `Vencimento do ${label.toLowerCase()} de ${c.name} em ${formatDate(start)}.`,
        start, end,
      })) created++;
    }
  }
  if (opts?.revalidate !== false) revalidatePath("/calendar");
  return { success: true, created, total: clients.length };
}
