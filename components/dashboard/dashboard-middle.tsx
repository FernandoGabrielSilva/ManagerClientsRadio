"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listEventsAction, deleteEventAction } from "@/app/actions/events";
import { formatDate } from "@/lib/date-utils";
import { isSameDay, startOfMonth, endOfMonth } from "date-fns";
import type { ReactNode } from "react";

type Vendor = { id: string; name: string | null };

export function DashboardMiddle({
  vendors,
  clients,
  pendingActions,
}: {
  vendors: Vendor[];
  clients: any[];
  pendingActions: ReactNode;
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);

  async function load(d: Date) {
    const evs = await listEventsAction(startOfMonth(d).toISOString(), endOfMonth(d).toISOString());
    setEvents(evs);
  }

  useEffect(() => { load(date); }, [date]);

  function eventLocalDate(e: any) {
    const d = new Date(e.start);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const eventDays = events.map((e) => eventLocalDate(e));
  const dayEvents = events.filter((e) => {
    const d = new Date(e.start);
    return d.getUTCFullYear() === date.getFullYear() && d.getUTCMonth() === date.getMonth() && d.getUTCDate() === date.getDate();
  });

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
                    <div className="text-xs text-muted-foreground">{formatDate(e.start)}{e.client?.name ? ` · ${e.client.name}` : ""}</div>
                    {e.description && <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">{e.description}</div>}
                  </div>
                  <Badge variant="outline" className={typeColor[e.type] ?? ""}>{e.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
