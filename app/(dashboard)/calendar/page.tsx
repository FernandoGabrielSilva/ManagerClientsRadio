import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CalendarView } from "@/components/calendar/calendar-view";
import { ensureClientContactEventsForUser, syncPendingGoogleEventsForUser } from "@/app/actions/events";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const role = (session!.user as { role?: string }).role;
  await ensureClientContactEventsForUser(userId, role, { revalidate: false });
  await syncPendingGoogleEventsForUser(userId);
  const vendors = await prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const where = role === "admin" ? { deletedAt: null, archivedAt: null } : { OR: [{ userId }, { vendorId: userId }], deletedAt: null, archivedAt: null };
  const clients = await prisma.client.findMany({ where, select: { id: true, name: true, lastContactAt: true, contactFrequencyDays: true, vendorId: true } });
  return <CalendarView vendors={vendors} clients={clients as any} />;
}
