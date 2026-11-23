"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function markNotificationReadAction(id: string) {
  const userId = await getUserId();
  await prisma.notification.update({ where: { id, userId }, data: { read: true } });
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const userId = await getUserId();
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  return { success: true };
}

export async function getUnreadCountAction() {
  const userId = await getUserId();
  return prisma.notification.count({ where: { userId, read: false } });
}
