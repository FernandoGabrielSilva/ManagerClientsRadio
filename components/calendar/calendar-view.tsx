"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { listEventsAction } from "@/app/actions/events";
import { formatDate } from "@/lib/date-utils";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Event as PrismaEvent } from "@/generated/prisma/client";

type CalendarEvent = PrismaEvent & { client: { name: string } | null };

export function CalendarView() {
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  async function load(d: Date) {
    try {
      const evs = await listEventsAction(
        startOfMonth(d).toISOString(),
        endOfMonth(d).toISOString(),
      );
      setEvents(evs);
    } catch (error) {
      toast.add({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar o calendário.",
      });
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load(date);
    });
  }, [date]);

  function eventLocalDate(e: CalendarEvent) {
    const d = new Date(e.start);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const eventDays = events.map((e) => eventLocalDate(e));
  const dayEvents = events.filter((e) => {
    const d = new Date(e.start);
    return (
      d.getUTCFullYear() === date.getFullYear() &&
      d.getUTCMonth() === date.getMonth() &&
      d.getUTCDate() === date.getDate()
    );
  });

  const typeColor: Record<string, string> = {
    video: "bg-primary/10 text-primary",
    contact: "bg-accent text-foreground",
    contract_expiry: "bg-destructive/10 text-destructive",
    custom: "bg-muted text-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="p-3 flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold" }}
              className="[--cell-size:--spacing(10)] text-base"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{formatDate(date)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum evento neste dia.
              </p>
            )}
            <div className="max-h-[360px] overflow-auto space-y-2 w-full">
              {dayEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 gap-2"
                >
                  <div>
                    <div className="text-sm font-medium break-words">
                      {e.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(e.start)}
                      {e.client?.name ? ` · ${e.client.name}` : ""}
                    </div>
                    {e.description && (
                      <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {e.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Badge
                      variant="outline"
                      className={typeColor[e.type] ?? ""}
                    >
                      {e.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
