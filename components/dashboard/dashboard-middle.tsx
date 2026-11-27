"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listEventsAction, deleteEventAction } from "@/app/actions/events";
import { formatDate } from "@/lib/date-utils";
import { isSameDay } from "date-fns";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

type Vendor = { id: string; name: string | null };

type PendingEvent = {
  id: string;
  title: string;
  start: string;
  type: string;
  clientId: string;
  clientName: string;
  description?: string;
};

export function DashboardMiddle({
  vendors,
  clients,
  pendingActions,
  pendingEvents = [],
}: {
  vendors: Vendor[];
  clients: any[];
  pendingActions: ReactNode;
  pendingEvents?: PendingEvent[];
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);

  async function load(d: Date) {
    const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    const end = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999));
    const evs = await listEventsAction(start.toISOString(), end.toISOString());
    setEvents(evs);
  }

  useEffect(() => { load(date); }, [date]);

  function eventLocalDate(e: any) {
    const d = new Date(e.start);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  const allEvents = useMemo(() => {
    const derived = pendingEvents.map((e) => ({
      ...e,
      start: new Date(e.start),
      client: { name: e.clientName },
      derived: true,
    }));
    const existing = new Set(
      events.map((e) => {
        const d = new Date(e.start);
        const day = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        return `${e.clientId ?? e.client?.id ?? ""}|${day}|${String(e.title).trim().toLowerCase()}`;
      }),
    );
    return [
      ...events,
      ...derived.filter((e) => {
        const d = new Date(e.start);
        const day = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        return !existing.has(`${e.clientId}|${day}|${e.title.trim().toLowerCase()}`);
      }),
    ];
  }, [events, pendingEvents]);

  const eventDays = allEvents.map((e) => eventLocalDate(e));
  const dayEvents = allEvents.filter((e) => isSameDay(eventLocalDate(e), date));

  const typeColor: Record<string, string> = {
    video: "bg-sky-100 text-sky-700",
    contact: "bg-amber-100 text-amber-700",
    contract_expiry: "bg-red-100 text-red-700",
    custom: "bg-muted text-foreground",
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
              {dayEvents.map((e) => (
                <div key={e.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium break-words">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(e.start)}{e.client?.name || e.clientName ? ` · ${e.client?.name ?? e.clientName}` : ""}</div>
                    {e.description && <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">{e.description}</div>}
                  </div>
                  <Badge variant="outline" className={typeColor[e.type] ?? ""}>{e.type}</Badge>
                  {!e.derived && (
                    <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Excluir evento?")) { await deleteEventAction(e.id); load(date); } }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
