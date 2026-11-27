"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listEventsAction, deleteEventAction } from "@/app/actions/events";
import { isManagedClientEventTitle } from "@/lib/client-events";
import { formatDate } from "@/lib/date-utils";
import { isSameDay } from "date-fns";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

type CalendarEvent = Awaited<ReturnType<typeof listEventsAction>>[number];

export function DashboardMiddle({
  pendingActions,
  syncKey,
}: {
  pendingActions: ReactNode;
  syncKey: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const fetchEvents = useCallback(async (d: Date) => {
    const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    const end = new Date(
      Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    );
    return listEventsAction(start.toISOString(), end.toISOString());
  }, []);

  useEffect(() => {
    let active = true;
    void fetchEvents(date).then((evs) => {
      if (active) setEvents(evs);
    });
    return () => {
      active = false;
    };
  }, [date, syncKey, fetchEvents]);

  async function load(d: Date) {
    setEvents(await fetchEvents(d));
  }

  function eventLocalDate(event: CalendarEvent) {
    const d = new Date(event.start);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  const eventDays = events.map((event) => eventLocalDate(event));
  const dayEvents = events.filter((event) =>
    isSameDay(eventLocalDate(event), date),
  );

  const typeColor: Record<string, string> = {
    video: "bg-sky-100 text-sky-700",
    contact: "bg-amber-100 text-amber-700",
    contract_expiry: "bg-red-100 text-red-700",
    custom: "bg-muted text-foreground",
  };
  const typeLabel: Record<string, string> = {
    video: "vídeo",
    contact: "contato",
    contract_expiry: "contrato",
    custom: "personalizado",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">{pendingActions}</div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/80">Calendário</h2>
        <Card className="h-[360px]">
          <CardContent className="p-3 flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold" }}
              className="[--cell-size:--spacing(9)] text-base"
            />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground/80">Agenda do dia</h2>
        <Card className="h-[360px]">
          <CardHeader>
            <CardTitle className="text-base">{formatDate(date)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>}
            <div className="max-h-[360px] overflow-auto space-y-2">
              {dayEvents.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium break-words">{event.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.start)}
                      {event.client?.name ? ` · ${event.client.name}` : ""}
                    </div>
                    {event.description && <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">{event.description}</div>}
                  </div>
                  <Badge variant="outline" className={typeColor[event.type] ?? ""}>
                    {typeLabel[event.type] ?? event.type}
                  </Badge>
                  {!isManagedClientEventTitle(event.title) && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Excluir evento ${event.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O evento “{event.title}” será removido da agenda e do Google Calendar, se estiver conectado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={async () => {
                              await deleteEventAction(event.id);
                              await load(date);
                              router.refresh();
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
