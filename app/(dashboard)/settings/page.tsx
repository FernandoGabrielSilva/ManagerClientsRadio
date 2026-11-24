import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id as string },
    select: {
      id: true, name: true, email: true, image: true, themeColor: true, themeMode: true,
      googleCalendarConnected: true, notificationsEnabled: true, autoCreateEvents: true,
      defaultContactFrequency: true, googleCalendarId: true, role: true, passwordHash: true,
    },
  });
  if (!user) return null;
  const users = user.role === "admin" ? await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }) : [];
  const notifications = await prisma.notification.findMany({ where: { userId: session!.user!.id as string }, orderBy: { createdAt: "desc" }, take: 100 });
  return <SettingsView user={{ ...user, hasPassword: !!user.passwordHash }} users={users} notifications={notifications} />;
}
