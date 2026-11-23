"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { profileSchema, passwordSchema, themeSchema } from "@/lib/validators";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function updateProfileAction(data: z.infer<typeof profileSchema>) {
  const userId = await getUserId();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: { name: d.name, email: d.email, image: d.image ?? null },
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function changePasswordAction(data: z.infer<typeof passwordSchema>) {
  const userId = await getUserId();
  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuário não encontrado" };
  if (user.passwordHash) {
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return { error: "Senha atual incorreta" };
  } else if (parsed.data.currentPassword) {
    return { error: "Esta conta não possui senha atual. Deixe o campo em branco para definir uma senha." };
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  return { success: true };
}

export async function updateThemeAction(data: z.infer<typeof themeSchema>) {
  const userId = await getUserId();
  const parsed = themeSchema.safeParse(data);
  if (!parsed.success) return { error: "Dados inválidos" };
  await prisma.user.update({
    where: { id: userId },
    data: { themeColor: parsed.data.themeColor, themeMode: parsed.data.themeMode },
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateNotificationPrefsAction(prefs: {
  notificationsEnabled?: boolean;
  autoCreateEvents?: boolean;
  defaultContactFrequency?: number;
  googleCalendarId?: string | null;
}) {
  const userId = await getUserId();
  await prisma.user.update({ where: { id: userId }, data: prefs });
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAllSyncedGoogleEventsAction() {
  const userId = await getUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleCalendarId: true },
  });
  const events = await prisma.event.findMany({ where: { userId, googleEventId: { not: null } } });
  let deleted = 0;
  if (user?.googleCalendarConnected && user.googleAccessToken) {
    const calendarId = user.googleCalendarId || "primary";
    for (const ev of events) {
      if (!ev.googleEventId) continue;
      try {
        await deleteCalendarEvent(user.googleAccessToken, user.googleRefreshToken, calendarId, ev.googleEventId);
        deleted++;
      } catch (e) {
        console.error("google bulk delete error", e);
      }
    }
  }
  await prisma.event.updateMany({ where: { userId, googleEventId: { not: null } }, data: { googleEventId: null } });
  revalidatePath("/calendar");
  revalidatePath("/settings");
  return { success: true, deleted, total: events.length };
}

export async function disconnectGoogleAction() {
  const userId = await getUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { googleCalendarConnected: false, googleAccessToken: null, googleRefreshToken: null, googleCalendarId: null },
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function updateUserRoleAction(userId: string, role: "admin" | "vendor") {
  const session = await auth();
  const me = session?.user as any;
  if (me?.role !== "admin") throw new Error("Sem permissão");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
  return { success: true };
}
