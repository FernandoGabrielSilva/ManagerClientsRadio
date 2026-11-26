"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createEventAction, deleteEventAction, ensureClientContactEventsAction, listEventsAction } from "@/app/actions/events";
import { formatDate, nextContactDate } from "@/lib/date-utils";
import { CalendarDays as CalendarIcon } from "lucide-react";
import { isSameDay, startOfMonth, endOfMonth } from "date-fns";

type Vendor = { id: string; name: string | null };

type ClientLite = { id: string; name: string; lastContactAt: string | Date | null; contactFrequencyDays: number; vendorId: string | null };
export function CalendarView({ vendors, clients = [] }: { vendors: Vendor[]; clients?: ClientLite[] }) {
  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");

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
    <div className="space-y-4">
       <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-3 flex justify-center overflow-x-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (!d) return;
                setDate(d);
                const evs = events.filter((e) => {
                  const dd = new Date(e.start);
                  return dd.getUTCFullYear() === d.getFullYear() && dd.getUTCMonth() === d.getMonth() && dd.getUTCDate() === d.getDate();
                });
                if (evs.length > 0) setDetailsOpen(true);
              }}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold" }}
              className="[--cell-size:--spacing(10)] text-base"
            />
          </CardContent>
        </Card>

      </div>


      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{formatDate(date)}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>}
            {dayEvents.map((e) => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(e.start)}{e.client?.name ? ` · ${e.client.name}` : ""}</div>
                  {e.description && <div className="text-xs text-muted-foreground break-words">{e.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Badge variant="outline" className={typeColor[e.type] ?? ""}>{e.type}</Badge>

                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
