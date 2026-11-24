"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { createBackgroundJob, markJobCompleted, markJobFailed, markJobProgress, markJobRunning } from "@/lib/background-jobs";

async function getUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return { id: session.user.id as string, role: (session.user as { role?: string }).role };
}

export async function getBackgroundJobsAction() {
  const user = await getUser();
  return prisma.backgroundJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function getBackgroundJobAction(id: string) {
  const user = await getUser();
  return prisma.backgroundJob.findFirst({ where: { id, userId: user.id } });
}

async function runDeleteSyncedGoogleEvents(jobId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
    });
    const events = await prisma.event.findMany({ where: { userId, googleEventId: { not: null } }, orderBy: { start: "asc" } });
    await markJobRunning(jobId, events.length);
    let deleted = 0;
    let failed = 0;
    if (user?.googleCalendarConnected && user.googleAccessToken) {
      const calendarId = user.googleCalendarId || "primary";
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev.googleEventId) { await markJobProgress(jobId, i + 1, events.length, `Processando ${i + 1}/${events.length}`); continue; }
        try {
          await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: null } });
          deleted++;
        } catch (e) {
          console.error("google bulk delete error", e);
          failed++;
        }
        await markJobProgress(jobId, i + 1, events.length, `Removendo ${i + 1}/${events.length}`);
      }
    }
    await markJobCompleted(jobId, { deleted, failed, total: events.length }, `Removidos ${deleted} de ${events.length}`);
    revalidatePath("/calendar");
    revalidatePath("/settings");
  } catch (e) {
    await markJobFailed(jobId, e instanceof Error ? e.message : String(e));
  }
}

async function runSyncGoogleIntegration(jobId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true, autoCreateEvents: true },
    });
    if (!user?.googleCalendarConnected || !user.googleAccessToken) {
      await markJobFailed(jobId, "Google não conectado");
      return;
    }
    const calendarId = user.googleCalendarId || "primary";
    const linked = await prisma.event.findMany({ where: { userId, googleEventId: { not: null } }, orderBy: { start: "asc" } });
    const local = user.autoCreateEvents ? await prisma.event.findMany({ where: { userId }, orderBy: { start: "asc" } }) : [];
    const total = linked.length + local.length;
    await markJobRunning(jobId, total);

    let deleted = 0;
    let deleteFailed = 0;
    let processed = 0;
    for (const ev of linked) {
      if (ev.googleEventId) {
        try {
          await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: null } });
          deleted++;
        } catch (e) {
          console.error("google sync delete error", e);
          deleteFailed++;
        }
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Removendo ${processed}/${linked.length}`);
    }

    let pushed = 0;
    let pushFailed = 0;
    for (let i = 0; i < local.length; i++) {
      const ev = local[i];
      try {
        const gid = await createCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, {
          title: ev.title, description: ev.description ?? undefined, start: ev.start, end: ev.end, allDay: ev.allDay,
        });
        if (gid) {
          await prisma.event.update({ where: { id: ev.id }, data: { googleEventId: gid } });
          pushed++;
        }
      } catch (e) {
        console.error("google sync push error", e);
        pushFailed++;
      }
      processed++;
      await markJobProgress(jobId, processed, total, `Recriando ${i + 1}/${local.length}`);
    }

    const message = user.autoCreateEvents
      ? `Removidos ${deleted}, recriados ${pushed}${deleteFailed + pushFailed ? `, ${deleteFailed + pushFailed} falha(s)` : ""}`
      : `Removidos ${deleted} do Google. Criação automática desativada.`;
    await markJobCompleted(jobId, { deleted, deleteFailed, pushed, pushFailed, total, autoCreateEvents: user.autoCreateEvents }, message);
    revalidatePath("/calendar");
    revalidatePath("/settings");
  } catch (e) {
    await markJobFailed(jobId, e instanceof Error ? e.message : String(e));
  }
}

export async function startDeleteSyncedGoogleEventsJobAction() {
  const user = await getUser();
  const job = await createBackgroundJob(user.id, "google_delete_synced", "Apagar eventos do site no Google");
  after(() => runDeleteSyncedGoogleEvents(job.id, user.id));
  return { jobId: job.id };
}

export async function startSyncGoogleIntegrationJobAction() {
  const user = await getUser();
  const job = await createBackgroundJob(user.id, "google_sync", "Sincronizar Google Agenda");
  after(() => runSyncGoogleIntegration(job.id, user.id));
  return { jobId: job.id };
}
