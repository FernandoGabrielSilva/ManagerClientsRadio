import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createCalendarEvent } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.googleCalendarConnected || !user.googleAccessToken) {
    return NextResponse.json({ error: "Google não conectado" }, { status: 400 });
  }
  const calendarId = user.googleCalendarId || "primary";
  let pushed = 0;
  const errors: string[] = [];

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
        pushed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("sync push error", msg);
      errors.push(`push:${ev.id}:${msg.slice(0, 80)}`);
    }
  }

  return NextResponse.json({ ok: true, pushed, pulled: 0, errors });
}
