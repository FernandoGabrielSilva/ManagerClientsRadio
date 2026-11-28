"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { eventSchema } from "@/lib/validators";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { formatDate, nextMonthlyVideoDate, resolveNextContact } from "@/lib/date-utils";
import {
  MANAGED_CLIENT_EVENT_PREFIXES,
  isManagedClientEventTitle,
} from "@/lib/client-events";
import { revalidatePath } from "next/cache";
import type { EventType } from "@/generated/prisma/client";
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

async function removeGoogleEvent(
  userId: string,
  googleEventId: string,
  user?: Awaited<ReturnType<typeof getGoogleUser>>,
) {
  const u = user ?? await getGoogleUser(userId);
  if (!u?.googleCalendarConnected || !u.googleAccessToken) return;
  try {
    await deleteCalendarEvent(
      u.googleAccessToken,
      u.googleRefreshToken,
      u.googleCalendarId || "primary",
      googleEventId,
    );
  } catch (e) {
    console.error("google delete error", e);
  }
}

async function deleteEventsByIds(
  userId: string,
  events: { id: string; googleEventId: string | null }[],
) {
  if (events.length === 0) return;
  const user = await getGoogleUser(userId);
  for (const event of events) {
    if (event.googleEventId) {
      await removeGoogleEvent(userId, event.googleEventId, user);
    }
  }
  await prisma.event.deleteMany({
    where: { id: { in: events.map((event) => event.id) } },
  });
}

async function deleteEventsForClientsInternal(userId: string, clientIds: string[]) {
  if (clientIds.length === 0) return;
  const user = await getGoogleUser(userId);
  const events = await prisma.event.findMany({ where: { userId, clientId: { in: clientIds } } });
  if (user?.googleCalendarConnected && user.googleAccessToken) {
    const calendarId = user.googleCalendarId || "primary";
    for (const ev of events) {
      if (!ev.googleEventId) continue;
      try {
        await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
      } catch (e) {
        console.error("google delete error", e);
      }
    }
  }
  await prisma.event.deleteMany({ where: { userId, clientId: { in: clientIds } } });
}

export async function deleteEventsForClients(userId: string, clientIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && sessionUserId !== userId) throw new Error("Sem permissão");
  await deleteEventsForClientsInternal(userId, clientIds);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function ensureClientContactEventsForUser(
  userId: string,
  role?: string,
  opts?: { revalidate?: boolean },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const sessionUserId = session.user.id as string;
  const sessionRole = (session.user as { role?: string }).role;
  if (sessionRole !== "admin" && sessionUserId !== userId) throw new Error("Sem permissão");
  return ensureClientContactEventsForUserInternal(
    userId,
    sessionRole === "admin" ? role : sessionRole,
    opts,
  );
}

async function syncPendingGoogleEventsForUserInternal(userId: string) {
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

export async function syncPendingGoogleEventsForUserInBackground(userId: string) {
  return syncPendingGoogleEventsForUserInternal(userId);
}

export async function syncPendingGoogleEventsForUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const sessionUserId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && sessionUserId !== userId) throw new Error("Sem permissão");
  return syncPendingGoogleEventsForUserInternal(userId);
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
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteEventAction(id: string) {
  const userId = await getUserId();
  const event = await prisma.event.findFirst({ where: { id, userId } });
  if (!event) return { error: "Evento não encontrado" };
  if (event.googleEventId) {
    await removeGoogleEvent(userId, event.googleEventId);
  }
  await prisma.event.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function listEventsAction(start: string, end: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  const scope =
    role === "admin"
      ? {
          OR: [
            { clientId: null },
            { client: { deletedAt: null, archivedAt: null } },
          ],
        }
      : {
          OR: [
            { userId, clientId: null },
            {
              client: {
                userId,
                deletedAt: null,
                archivedAt: null,
              },
            },
            {
              client: {
                vendorId: userId,
                deletedAt: null,
                archivedAt: null,
              },
            },
          ],
        };
  return prisma.event.findMany({
    where: {
      start: { gte: new Date(start), lte: new Date(end) },
      ...scope,
    },
    include: { client: true },
    orderBy: { start: "asc" },
  });
}

export async function ensureClientContactEventsForUserInBackground(userId: string, role?: string, opts?: { revalidate?: boolean }) {
  return ensureClientContactEventsForUserInternal(userId, role, opts);
}

export async function ensureClientContactEventsAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role;
  return ensureClientContactEventsForUserInternal(userId, role);
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date): Date {
  return new Date(date.getTime() + 86400000);
}

async function upsertAutoEvent(
  userId: string,
  key: {
    clientId: string;
    type: EventType;
    start: Date;
    titlePrefix: string;
    matchByStart?: boolean;
  },
  data: { title: string; description: string; start: Date; end: Date },
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.event.findFirst({
    where: {
      userId,
      clientId: key.clientId,
      type: key.type,
      title: { startsWith: key.titlePrefix },
      ...(key.matchByStart ? { start: key.start } : {}),
    },
    orderBy: { start: "asc" },
  });

  if (existing) {
    const changed =
      existing.title !== data.title ||
      existing.description !== data.description ||
      existing.start.getTime() !== data.start.getTime() ||
      existing.end?.getTime() !== data.end.getTime();
    if (changed) {
      if (existing.googleEventId) {
        await removeGoogleEvent(userId, existing.googleEventId);
      }
      await prisma.event.update({
        where: { id: existing.id },
        data: { ...data, allDay: true, googleEventId: null },
      });
      await pushEventToGoogle(userId, { ...existing, ...data, id: existing.id });
    }
    return { id: existing.id, created: false };
  }

  const event = await prisma.event.create({
    data: {
      userId,
      clientId: key.clientId,
      type: key.type,
      ...data,
      allDay: true,
    },
  });
  await pushEventToGoogle(userId, event);
  return { id: event.id, created: true };
}

async function deleteAutoEventsExcept(
  userId: string,
  clientId: string,
  keepIds: string[],
) {
  const events = await prisma.event.findMany({
    where: {
      userId,
      clientId,
      id: { notIn: keepIds },
      OR: MANAGED_CLIENT_EVENT_PREFIXES.map((prefix) => ({
        title: { startsWith: prefix },
      })),
    },
    select: { id: true, googleEventId: true },
  });
  await deleteEventsByIds(userId, events);
}

async function ensureClientContactEventsForUserInternal(userId: string, role?: string, opts?: { revalidate?: boolean }) {
  const where = role === "admin"
    ? { deletedAt: null, archivedAt: null }
    : { OR: [{ userId }, { vendorId: userId }], deletedAt: null, archivedAt: null };
  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      name: true,
      lastContactAt: true,
      nextContactAt: true,
      contactFrequencyDays: true,
      nextAction: true,
      nextActionDate: true,
      videoFrequency: true,
      videoWeekday: true,
      needsAdChange: true,
      lastVideoSentAt: true,
      contracts: {
        where: { deletedAt: null, archivedAt: null },
        select: { id: true, number: true, endDate: true },
      },
    },
  });
  const todayUtc = utcDay(new Date());
  const tomorrowUtc = nextUtcDay(todayUtc);
  let created = 0;

  for (const c of clients) {
    const keepIds: string[] = [];

    if (c.lastContactAt) {
      const start = utcDay(new Date(c.lastContactAt));
      const result = await upsertAutoEvent(userId, {
        clientId: c.id,
        type: "contact",
        start,
        titlePrefix: "Último contato:",
      }, {
        title: `Último contato: ${c.name}`,
        description: `Último contato com ${c.name} em ${formatDate(start)}.`,
        start,
        end: nextUtcDay(start),
      });
      keepIds.push(result.id);
      if (result.created) created++;
    }

    const next = resolveNextContact({
      lastContactAt: c.lastContactAt,
      contactFrequencyDays: c.contactFrequencyDays ?? 14,
      nextContactAt: c.nextContactAt,
    });
    if (next) {
      const nextStart = utcDay(next);
      const result = await upsertAutoEvent(userId, {
        clientId: c.id,
        type: "contact",
        start: nextStart,
        titlePrefix: "Próximo contato:",
      }, {
        title: `Próximo contato: ${c.name}`,
        description: `Próximo contato com ${c.name} em ${formatDate(nextStart)}.`,
        start: nextStart,
        end: nextUtcDay(nextStart),
      });
      keepIds.push(result.id);
      if (result.created) created++;

      if (nextStart.getTime() < todayUtc.getTime()) {
        const overdue = await upsertAutoEvent(userId, {
          clientId: c.id,
          type: "contact",
          start: todayUtc,
          titlePrefix: "Contatar:",
        }, {
          title: `Contatar: ${c.name}`,
          description: `Contato com ${c.name} atrasado desde ${formatDate(nextStart)}.`,
          start: todayUtc,
          end: tomorrowUtc,
        });
        keepIds.push(overdue.id);
        if (overdue.created) created++;
      }
    }

    if (c.nextActionDate) {
      const agendaStart = utcDay(new Date(c.nextActionDate));
      const actionLabel = c.nextAction ?? "Visita";
      const agenda = await upsertAutoEvent(userId, {
        clientId: c.id,
        type: "contact",
        start: agendaStart,
        titlePrefix: "Próxima ação:",
      }, {
        title: `Próxima ação: ${actionLabel} · ${c.name}`,
        description: `${actionLabel} com ${c.name} em ${formatDate(agendaStart)}.`,
        start: agendaStart,
        end: nextUtcDay(agendaStart),
      });
      keepIds.push(agenda.id);
      if (agenda.created) created++;

      const legacyEvents = await prisma.event.findMany({
        where: {
          userId,
          clientId: c.id,
          type: "contact",
          start: agendaStart,
          id: { notIn: keepIds },
        },
        select: { id: true, googleEventId: true, title: true },
      });
      await deleteEventsByIds(
        userId,
        legacyEvents
          .filter((event) => !isManagedClientEventTitle(event.title))
          .map(({ id, googleEventId }) => ({ id, googleEventId })),
      );
    }

    for (const ct of c.contracts) {
      const start = utcDay(new Date(ct.endDate));
      const label = ct.number ? `Contrato ${ct.number}` : "Contrato";
      const result = await upsertAutoEvent(userId, {
        clientId: c.id,
        type: "contract_expiry",
        start,
        titlePrefix: `Vencimento ${label}:`,
      }, {
        title: `Vencimento ${label}: ${c.name}`,
        description: `Vencimento do ${label.toLowerCase()} de ${c.name} em ${formatDate(start)}.`,
        start,
        end: nextUtcDay(start),
      });
      keepIds.push(result.id);
      if (result.created) created++;
    }

    const videoFrequency = c.videoFrequency ?? "weekly";
    const lastVideoSentAt = c.lastVideoSentAt ? new Date(c.lastVideoSentAt) : null;
    const lastVideoDay = lastVideoSentAt ? utcDay(lastVideoSentAt).getTime() : null;
    const windowEnd = new Date(todayUtc.getTime() + 7 * 86400000);

    if (videoFrequency === "monthly") {
      const videoDate = nextMonthlyVideoDate(lastVideoSentAt, todayUtc);
      if (videoDate.getTime() < windowEnd.getTime() && lastVideoDay !== videoDate.getTime()) {
        const result = await upsertAutoEvent(userId, {
          clientId: c.id,
          type: "video",
          start: videoDate,
          titlePrefix: "Enviar vídeo:",
          matchByStart: true,
        }, {
          title: `Enviar vídeo: ${c.name}`,
          description: `Enviar vídeo mensal para ${c.name} em ${formatDate(videoDate)}.`,
          start: videoDate,
          end: nextUtcDay(videoDate),
        });
        keepIds.push(result.id);
        if (result.created) created++;
      }
    } else {
      const weekdayMask = c.videoWeekday ?? 0;
      for (let offset = 0; offset < 7; offset++) {
        const videoDate = new Date(todayUtc.getTime() + offset * 86400000);
        if ((weekdayMask & (1 << videoDate.getUTCDay())) === 0) continue;
        if (lastVideoDay === videoDate.getTime()) continue;
        const result = await upsertAutoEvent(userId, {
          clientId: c.id,
          type: "video",
          start: videoDate,
          titlePrefix: "Enviar vídeo:",
          matchByStart: true,
        }, {
          title: `Enviar vídeo: ${c.name}`,
          description: `Enviar vídeo semanal para ${c.name} em ${formatDate(videoDate)}.`,
          start: videoDate,
          end: nextUtcDay(videoDate),
        });
        keepIds.push(result.id);
        if (result.created) created++;
      }
    }

    if (c.needsAdChange) {
      const result = await upsertAutoEvent(userId, {
        clientId: c.id,
        type: "custom",
        start: todayUtc,
        titlePrefix: "Sugerir mudança de anúncio:",
      }, {
        title: `Sugerir mudança de anúncio: ${c.name}`,
        description: `${c.name} aguardando sugestão de mudança de anúncio.`,
        start: todayUtc,
        end: tomorrowUtc,
      });
      keepIds.push(result.id);
      if (result.created) created++;
    }

    await deleteAutoEventsExcept(userId, c.id, keepIds);
  }

  if (opts?.revalidate !== false) {
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
  }
  return { success: true, created, total: clients.length };
}
