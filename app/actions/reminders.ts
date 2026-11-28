"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reminderSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function createReminderAction(data: z.infer<typeof reminderSchema>) {
  const userId = await getUserId();
  const parsed = reminderSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.reminder.create({
    data: {
      userId,
      title: d.title,
      message: d.message ?? null,
      dueDate: new Date(d.dueDate),
      type: d.type,
      clientId: d.clientId || null,
    },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateReminderAction(id: string, data: z.infer<typeof reminderSchema>) {
  const userId = await getUserId();
  const parsed = reminderSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.reminder.update({
    where: { id, userId },
    data: {
      title: d.title,
      message: d.message ?? null,
      dueDate: new Date(d.dueDate),
      type: d.type,
      clientId: d.clientId || null,
    },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function completeReminderAction(id: string) {
  const userId = await getUserId();
  await prisma.reminder.update({
    where: { id, userId },
    data: { completed: true, completedAt: new Date() },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function uncompleteReminderAction(id: string) {
  const userId = await getUserId();
  await prisma.reminder.update({
    where: { id, userId },
    data: { completed: false, completedAt: null },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveRemindersAction(ids: string[]) {
  const userId = await getUserId();
  await prisma.reminder.updateMany({ where: { id: { in: ids }, userId }, data: { archivedAt: new Date(), deletedAt: null } });
  revalidatePath("/reminders");
  return { success: true };
}

export async function deleteRemindersAction(ids: string[]) {
  const userId = await getUserId();
  await prisma.reminder.updateMany({ where: { id: { in: ids }, userId }, data: { deletedAt: new Date(), archivedAt: null } });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function restoreRemindersAction(ids: string[]) {
  const userId = await getUserId();
  const toRestore = await prisma.reminder.findMany({ where: { id: { in: ids }, userId, deletedAt: { not: null } } });
  let restored = 0;
  let skipped = 0;
  for (const r of toRestore) {
    const dup = await prisma.reminder.findFirst({ where: { userId, deletedAt: null, title: r.title, dueDate: r.dueDate } });
    if (dup) { skipped++; continue; }
    await prisma.reminder.update({ where: { id: r.id }, data: { archivedAt: null, deletedAt: null } });
    restored++;
  }
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true, restored, skipped };
}

export async function permanentDeleteRemindersAction(ids: string[]) {
  const userId = await getUserId();
  await prisma.reminder.deleteMany({ where: { id: { in: ids }, userId } });
  revalidatePath("/reminders");
  return { success: true };
}

export async function deleteReminderAction(id: string) {
  const userId = await getUserId();
  await prisma.reminder.update({ where: { id, userId }, data: { deletedAt: new Date(), archivedAt: null } });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}
