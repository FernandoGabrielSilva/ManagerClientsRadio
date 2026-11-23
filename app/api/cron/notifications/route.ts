import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isContactOverdue, isContractExpiringSoon, isVideoDueToday } from "@/lib/date-utils";
import { startOfDay } from "date-fns";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany();
  let created = 0;
  const today = startOfDay(new Date());

  for (const user of users) {
    if (!user.notificationsEnabled) continue;
    const clients = await prisma.client.findMany({ where: { userId: user.id } });
    for (const c of clients) {
      // vídeo hoje
      if (isVideoDueToday(c.videoWeekday)) {
        const exists = await prisma.notification.findFirst({
          where: { userId: user.id, clientId: c.id, title: { contains: "Enviar vídeo" }, createdAt: { gte: today } },
        });
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              clientId: c.id,
              type: "info",
              title: `Enviar vídeo para ${c.name}`,
              message: `Hoje é dia de enviar o vídeo semanal para ${c.name}.`,
              link: `/clients/${c.id}`,
            },
          });
          created++;
        }
      }
      // contato atrasado
      if (isContactOverdue(c.lastContactAt, c.contactFrequencyDays)) {
        const exists = await prisma.notification.findFirst({
          where: { userId: user.id, clientId: c.id, title: { contains: "Contatar" }, createdAt: { gte: today } },
        });
        if (!exists) {
          const days = c.lastContactAt ? Math.floor((Date.now() - new Date(c.lastContactAt).getTime()) / 86400000) : null;
          await prisma.notification.create({
            data: {
              userId: user.id,
              clientId: c.id,
              type: "warning",
              title: `Contatar ${c.name}`,
              message: `Último contato há ${days ?? "—"} dias. Entre em contato.`,
              link: `/clients/${c.id}`,
            },
          });
          created++;
        }
      }
      // sugestão de mudança de anúncio
      if (c.needsAdChange) {
        const exists = await prisma.notification.findFirst({
          where: { userId: user.id, clientId: c.id, title: { contains: "Sugerir mudança" }, createdAt: { gte: today } },
        });
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              clientId: c.id,
              type: "info",
              title: `Sugerir mudança de anúncio para ${c.name}`,
              message: "Lembre-se de sugerir uma alteração no criativo/anúncio.",
              link: `/clients/${c.id}`,
            },
          });
          created++;
        }
      }
      // contrato a vencer
      if (isContractExpiringSoon(c.contractEnd, 30)) {
        const exists = await prisma.notification.findFirst({
          where: { userId: user.id, clientId: c.id, title: { contains: "Contrato" }, createdAt: { gte: today } },
        });
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              clientId: c.id,
              type: "warning",
              title: `Contrato de ${c.name} vence em breve`,
              message: `Vencimento em ${c.contractEnd?.toISOString().slice(0, 10)}.`,
              link: `/clients/${c.id}`,
            },
          });
          created++;
        }
      }
    }
  }

  // contract expiry alerts (30/15/5 days)
  const contracts = await prisma.contract.findMany({ include: { client: true } });
  for (const ct of contracts) {
    const days = Math.floor((new Date(ct.endDate).getTime() - Date.now()) / 86400000);
    if (![30, 15, 5].includes(days)) continue;
    const userId = ct.vendorId ?? (await prisma.client.findUnique({ where: { id: ct.clientId } }))?.userId;
    if (!userId) continue;
    const exists = await prisma.notification.findFirst({
      where: { userId, clientId: ct.clientId, title: { contains: "Contrato" }, createdAt: { gte: today } },
    });
    if (exists) continue;
    await prisma.notification.create({
      data: {
        userId,
        clientId: ct.clientId,
        type: "warning",
        title: `Contrato de ${ct.client?.name} vence em ${days} dias`,
        message: `Renove o contrato. Vencimento em ${ct.endDate.toISOString().slice(0, 10)}.`,
        link: `/contracts/${ct.id}`,
      },
    });
    created++;
  }

  // purge trash older than retention window
  const trashDays = Number(process.env.TRASH_RETENTION_DAYS || 30);
  const cutoff = new Date(Date.now() - trashDays * 86400000);
  await prisma.client.deleteMany({ where: { deletedAt: { not: null, lt: cutoff } } });
  await prisma.contract.deleteMany({ where: { deletedAt: { not: null, lt: cutoff } } });

  return NextResponse.json({ ok: true, created });
}
