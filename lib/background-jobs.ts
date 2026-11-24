import { prisma } from "@/lib/db";
import { BackgroundJobStatus, Prisma } from "@prisma/client";

export async function createBackgroundJob(userId: string, type: string, title: string, total = 0) {
  return prisma.backgroundJob.create({
    data: { userId, type, title, status: "pending", total, progress: 0, processed: 0 },
  });
}

export async function updateBackgroundJob(id: string, data: {
  status?: BackgroundJobStatus;
  progress?: number;
  total?: number;
  processed?: number;
  message?: string | null;
  error?: string | null;
  result?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}) {
  return prisma.backgroundJob.update({ where: { id }, data });
}

export async function markJobRunning(id: string, total?: number) {
  return updateBackgroundJob(id, { status: "running", progress: 0, processed: 0, total: total ?? 0, message: "Iniciando...", error: null });
}

export async function markJobProgress(id: string, processed: number, total: number, message?: string) {
  const progress = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  return updateBackgroundJob(id, { status: "running", processed, total, progress, message: message ?? null });
}

export async function markJobCompleted(id: string, result?: Prisma.InputJsonValue, message?: string) {
  const job = await prisma.backgroundJob.findUnique({ where: { id }, select: { total: true, processed: true } });
  return updateBackgroundJob(id, {
    status: "completed",
    progress: 100,
    processed: job?.total ? job.total : job?.processed ?? 0,
    message: message ?? "Concluído",
    result: result ?? Prisma.DbNull,
  });
}

export async function markJobFailed(id: string, error: string) {
  return updateBackgroundJob(id, { status: "failed", error, message: "Falhou" });
}
