"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { eventSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function createEventAction(data: z.infer<typeof eventSchema>) {
  const userId = await getUserId();
  const parsed = eventSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data;
  await prisma.event.create({
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
  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteEventAction(id: string) {
  const userId = await getUserId();
  await prisma.event.delete({ where: { id, userId } });
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
