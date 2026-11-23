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
  const [open, setOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [form, setForm] = useState({ title: "", type: "custom", start: "", end: "" });

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

  async function handleCreate() {
    await createEventAction({
      title: form.title,
      type: form.type as any,
      start: form.start,
      end: form.end || null,
      allDay: true,
      description: null,
      clientId: null,
    } as any);
    setOpen(false);
    setForm({ title: "", type: "custom", start: "", end: "" });
    load(date);
  }

  const typeColor: Record<string, string> = {
    video: "bg-sky-100 text-sky-700",
    contact: "bg-amber-100 text-amber-700",
    contract_expiry: "bg-red-100 text-red-700",
    custom: "bg-muted text-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarIcon className="h-5 w-5" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Calendário</h1><p className="text-sm text-muted-foreground">Agenda de eventos e compromissos</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { await ensureClientContactEventsAction(); load(date); }}>Gerar eventos de clientes</Button>
          <Button onClick={() => setOpen(true)}>Novo evento</Button>
        </div>
      </div>

       <div className="grid lg:grid-cols-[460px_1fr] gap-4">
        <Card>
          <CardContent className="p-3 flex justify-center">
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
            {dayEvents.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>}
            <div className="max-h-[360px] overflow-auto space-y-2">
            {dayEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between border rounded-md px-3 py-2 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(e.start)}{e.client?.name ? ` · ${e.client.name}` : ""}</div>
                  {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={typeColor[e.type] ?? ""}>{e.type}</Badge>
                  <Button size="sm" variant="ghost" onClick={async () => { await deleteEventAction(e.id); load(date); }}>Excluir</Button>
                </div>
              </div>
            ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v: string | null) => setForm({ ...form, type: v ?? "custom" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="contact">Contato</SelectItem>
                  <SelectItem value="contract_expiry">Vencimento</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data fim</Label>
              <Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
            <Button onClick={handleCreate}>Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
