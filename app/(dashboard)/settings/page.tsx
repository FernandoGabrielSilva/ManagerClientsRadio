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
      defaultContactFrequency: true, googleCalendarId: true, role: true, autoClearCompletedJobs: true,
    },
  });
  if (!user) return null;
  // Nunca serializar o hash para o cliente: consultamos apenas a flag derivada.
  const passwordRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const hasPassword = Boolean(passwordRecord?.passwordHash);
  const users = user.role === "admin" ? await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }) : [];
  const notifications = await prisma.notification.findMany({ where: { userId: session!.user!.id as string }, orderBy: { createdAt: "desc" }, take: 100 });
  return <SettingsView user={{
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    themeColor: user.themeColor,
    themeMode: user.themeMode,
    googleCalendarConnected: user.googleCalendarConnected,
    notificationsEnabled: user.notificationsEnabled,
    autoCreateEvents: user.autoCreateEvents,
    defaultContactFrequency: user.defaultContactFrequency,
    googleCalendarId: user.googleCalendarId,
    role: user.role,
    hasPassword,
    autoClearCompletedJobs: user.autoClearCompletedJobs,
  }} users={users} notifications={notifications} />;
}
