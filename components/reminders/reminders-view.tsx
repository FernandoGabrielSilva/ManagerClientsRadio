"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { createReminderAction, updateReminderAction, deleteReminderAction, completeReminderAction } from "@/app/actions/reminders";
import { formatDate } from "@/lib/date-utils";

type Reminder = {
  id: string;
  title: string;
  message: string | null;
  dueDate: string | Date;
  type: string;
  completed: boolean;
  client?: { name: string } | null;
  clientId?: string | null;
};

const types = ["video", "contact", "ad_change", "contract_expiry", "custom"];

export function RemindersView({ reminders, clients }: { reminders: Reminder[]; clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: "", message: "", dueDate: "", type: "custom", clientId: "" });
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setForm({ title: "", message: "", dueDate: "", type: "custom", clientId: "" });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditing(r);
    setForm({
      title: r.title,
      message: r.message ?? "",
      dueDate: new Date(r.dueDate).toISOString().slice(0, 10),
      type: r.type,
      clientId: r.clientId ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit() {
    setLoading(true);
    const payload = {
      title: form.title,
      message: form.message || null,
      dueDate: form.dueDate,
      type: form.type as any,
      clientId: form.clientId || null,
    };
    const res = editing
      ? await updateReminderAction(editing.id, payload as any)
      : await createReminderAction(payload as any);
    setLoading(false);
    if (res?.error) { toast.add({ title: "Erro", description: res.error }); return; }
    toast.add({ title: "Concluído" });
    setOpen(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir lembrete?")) return;
    await deleteReminderAction(id);
    toast.add({ title: "Excluído" });
    router.refresh();
  }

  async function handleComplete(id: string) {
    await completeReminderAction(id);
    toast.add({ title: "Concluído" });
    router.refresh();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo lembrete</Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reminders.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum lembrete.</TableCell></TableRow>
            )}
            {reminders.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.client?.name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell className="tabular-nums">{formatDate(new Date(r.dueDate))}</TableCell>
                <TableCell>{r.completed ? <Badge variant="secondary">Concluído</Badge> : <Badge>Pendente</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!r.completed && <Button size="sm" variant="ghost" onClick={() => handleComplete(r.id)}><CheckCircle2 className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar lembrete" : "Novo lembrete"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v: string | null) => setForm({ ...form, type: v ?? "custom" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.clientId} onValueChange={(v: string | null) => setForm({ ...form, clientId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
