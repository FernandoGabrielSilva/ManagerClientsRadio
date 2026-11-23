import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createCalendarEvent, listCalendarEvents } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.googleCalendarConnected || !user.googleAccessToken) {
    return NextResponse.json({ error: "Google não conectado" }, { status: 400 });
  }
  const calendarId = user.googleCalendarId || "primary";
  let created = 0;

  // Push local events without googleEventId
  if (user.autoCreateEvents) {
    const pending = await prisma.event.findMany({
      where: { userId: user.id, googleEventId: null },
    });
    for (const ev of pending) {
      try {
        const gid = await createCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, {
          title: ev.title,
          description: ev.description ?? undefined,
          start: ev.start,
          end: ev.end,
          allDay: ev.allDay,
        });
        if (gid) {
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: gid } });
          created++;
        }
      } catch (e) {
        console.error("sync push error", e);
      }
    }
  }

  // Pull events from Google (basic)
  try {
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
    const items = await listCalendarEvents(user.googleAccessToken, user.googleRefreshToken, calendarId, now, later);
    for (const it of items) {
      if (!it.id) continue;
      const existing = await prisma.event.findFirst({ where: { userId: user.id, googleEventId: it.id } });
      if (existing) continue;
      const start = it.start?.dateTime || it.start?.date;
      if (!start) continue;
      await prisma.event.create({
        data: {
          userId: user.id,
          title: it.summary || "Evento Google",
          description: it.description ?? null,
          start: new Date(start),
          end: it.end?.dateTime || it.end?.date ? new Date(it.end.dateTime || it.end.date!) : null,
          allDay: !!it.start?.date && !it.start?.dateTime,
          type: "custom",
          googleEventId: it.id,
        },
      });
      created++;
    }
  } catch (e) {
    console.error("sync pull error", e);
  }

  return NextResponse.json({ ok: true, created });
}
