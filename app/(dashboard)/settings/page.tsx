import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user!.id as string } });
  if (!user) return null;
  const users = user.role === "admin" ? await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }) : [];
  return <SettingsView user={user} users={users} />;
}
