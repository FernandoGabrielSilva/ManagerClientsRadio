"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { eventSchema } from "@/lib/validators";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

async function pushEventToGoogle(userId: string, event: { id: string; title: string; description: string | null; start: Date; end: Date | null; allDay: boolean }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarConnected: true, autoCreateEvents: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
  });
  if (!user?.googleCalendarConnected || !user.autoCreateEvents || !user.googleAccessToken) return;
  const calendarId = user.googleCalendarId || "primary";
  try {
    const gid = await createCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, {
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
