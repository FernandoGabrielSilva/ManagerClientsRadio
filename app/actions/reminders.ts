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
  revalidatePath("/dashboard");
  return { success: true };
}

export async function completeReminderAction(id: string) {
  const userId = await getUserId();
  await prisma.reminder.update({
    where: { id, userId },
    data: { completed: true, completedAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteReminderAction(id: string) {
  const userId = await getUserId();
  await prisma.reminder.delete({ where: { id, userId } });
  revalidatePath("/dashboard");
  return { success: true };
}
