import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell as BellIcon } from "lucide-react";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions/notifications";
import { formatDate } from "@/lib/date-utils";
import Link from "next/link";
import type { Notification } from "@prisma/client";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const notifs: Notification[] = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BellIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
            <p className="text-sm text-muted-foreground">Atualizações e alertas do sistema</p>
          </div>
        </div>
        <form action={async () => { "use server"; await markAllNotificationsReadAction(); }}>
          <Button type="submit" variant="outline">Marcar todas como lidas</Button>
        </form>
      </div>
      <div className="space-y-2">
        {notifs.length === 0 && <p className="text-muted-foreground">Sem notificações.</p>}
        {notifs.map((n: Notification) => (
          <Card key={n.id} className={n.read ? "opacity-60" : ""}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</div>
              </div>
              <div className="flex gap-2">
                {n.link && <Link href={n.link}><Button variant="ghost" size="sm">Abrir</Button></Link>}
                {!n.read && (
                  <form action={async () => { "use server"; await markNotificationReadAction(n.id); }}>
                    <Button type="submit" size="sm" variant="outline">Ler</Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
