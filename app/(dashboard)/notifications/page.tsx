import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell as BellIcon } from "lucide-react";
import { markNotificationReadAction, markAllNotificationsReadAction, clearNotificationsAction } from "@/app/actions/notifications";
import { formatDate } from "@/lib/date-utils";
import Link from "next/link";
import type { Notification } from "@prisma/client";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user!.id as string;
  const notifs: Notification[] = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BellIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
            <p className="text-sm text-muted-foreground">Atualizações e alertas do sistema</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={async () => { "use server"; await markAllNotificationsReadAction(); }}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">Marcar todas como lidas</Button>
          </form>
          <form action={async () => { "use server"; await clearNotificationsAction(); }}>
            <Button type="submit" variant="destructive" className="w-full sm:w-auto">Limpar notificações</Button>
          </form>
        </div>
      </div>
      <div className="space-y-2">
        {notifs.length === 0 && <p className="text-muted-foreground">Sem notificações.</p>}
        {notifs.map((n: Notification) => (
          <Card key={n.id} className={n.read ? "opacity-60" : ""}>
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium break-words">{n.title}</div>
                <div className="text-sm text-muted-foreground break-words">{n.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
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
