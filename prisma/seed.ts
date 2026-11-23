import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@manager.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Demo User",
        email,
        passwordHash: await bcrypt.hash("password123", 10),
        themeColor: "#6366f1",
        themeMode: "light",
      },
    });
  }

  const clientsData = [
    { name: "Clínica Olhos Vida", company: "Clínica Olhos Vida", videoWeekday: 1, contactFrequencyDays: 14, contractStatus: "active" as const },
    { name: "Ótica Central", company: "Ótica Central", videoWeekday: 3, contactFrequencyDays: 14, contractStatus: "active" as const },
    { name: "Clínica Visão Plus", company: "Clínica Visão Plus", videoWeekday: 5, contactFrequencyDays: 21, contractStatus: "negotiation" as const },
  ];

  const clients = [];
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { userId: user.id, name: c.name } });
    if (existing) { clients.push(existing); continue; }
    const created = await prisma.client.create({
      data: {
        userId: user.id,
        name: c.name,
        company: c.company,
        phone: "(11) 99999-0000",
        email: "contato@exemplo.com",
        videoWeekday: c.videoWeekday,
        lastContactAt: new Date(Date.now() - 20 * 86400000),
        contactFrequencyDays: c.contactFrequencyDays,
        contractStatus: c.contractStatus,
        contractStart: new Date(),
        contractEnd: new Date(Date.now() + 20 * 86400000),
        contractValue: 1500,
        notes: "Cliente de exemplo",
        needsAdChange: true,
      },
    });
    clients.push(created);
  }

  // reminder
  await prisma.reminder.create({
    data: { userId: user.id, clientId: clients[0].id, type: "video", title: "Enviar vídeo", dueDate: new Date(), completed: false },
  }).catch(() => {});

  await prisma.notification.create({
    data: { userId: user.id, clientId: clients[0].id, type: "info", title: "Bem-vindo", message: "Sistema configurado com dados de exemplo." },
  }).catch(() => {});

  console.log("Seed concluído. Login: demo@manager.com / password123");
}

main().finally(() => prisma.$disconnect());
