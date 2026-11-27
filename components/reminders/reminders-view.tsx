"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, CheckCircle2, Archive, RotateCcw } from "lucide-react";
import {
  createReminderAction,
  updateReminderAction,
  deleteRemindersAction,
  archiveRemindersAction,
  restoreRemindersAction,
  permanentDeleteRemindersAction,
  completeReminderAction,
  uncompleteReminderAction,
} from "@/app/actions/reminders";
import { formatDate } from "@/lib/date-utils";
import { getActiveClientsAction } from "@/app/actions/clients";
import { SortFilter } from "@/components/ui/sort-filter";

type Reminder = {
  id: string;
  title: string;
  message: string | null;
  dueDate: string | Date;
  type: string;
  completed: boolean;
  clientId: string | null;
  client?: { name: string } | null;
};

const types = ["video", "contact", "ad_change", "contract_expiry", "custom"];
const typeLabels: Record<string, string> = {
  video: "Vídeo",
  contact: "Contato",
  ad_change: "Mudança de anúncio",
  contract_expiry: "Vencimento de contrato",
  custom: "Personalizado",
};

export function RemindersView({
  reminders,
  clients,
  view = "active",
}: {
  reminders: Reminder[];
  clients: { id: string; name: string }[];
  view?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    getActiveClientsAction().then((c) => { if (Array.isArray(c) && c.length) setClientList(c); }).catch(() => {});
  }, []);
  const source = reminders;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("dueDate|asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ type: string; open: boolean }>({ type: "", open: false });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: "", message: "", dueDate: "", type: "custom", clientId: "" });
  const [clientList, setClientList] = useState(clients);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  const typesList = useMemo(() => Array.from(new Set(reminders.map((r) => r.type).filter(Boolean))), [reminders]);

  const filtered = reminders
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (q && ![r.title, r.message, r.type, r.client?.name].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all") {
        const st = r.completed ? "Concluído" : "Pendente";
        if (st !== statusFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const [field, dir] = sort.split("|");
      let cmp = 0;
      if (field === "title") cmp = a.title.localeCompare(b.title);
      else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return dir === "desc" ? -cmp : cmp;
    });

  useEffect(() => { setPage(1); }, [query, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) paged.forEach((r) => next.delete(r.id));
    else paged.forEach((r) => next.add(r.id));
    setSelected(next);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function clearLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressStart.current = null;
  }
  function onRowPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, [role='checkbox'], [data-slot='checkbox']")) return;
    longPressFired.current = false;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelected((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }, 450);
  }
  function onRowPointerMove(e: React.PointerEvent) {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > 8) clearLongPress();
  }
  function onRowPointerUp() { clearLongPress(); }

  function resetForm() {
    setForm({ title: "", message: "", dueDate: "", type: "custom", clientId: "" });
    setEditing(null);
  }

  function openCreate() { resetForm(); setOpen(true); }
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
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteRemindersAction([deleteId]);
    toast.add({ title: "Excluído" });
    setDeleteOpen(false);
    setDeleteId(null);
    router.refresh();
  }

  async function runAction() {
    setLoading(true);
    const ids = [...selected];
    try {
      if (confirmDialog.type === "archive") await archiveRemindersAction(ids);
      else if (confirmDialog.type === "delete") await deleteRemindersAction(ids);
      else if (confirmDialog.type === "restore") await restoreRemindersAction(ids);
      else if (confirmDialog.type === "purge") await permanentDeleteRemindersAction(ids);
      toast.add({ title: "Concluído" });
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.add({ title: "Erro", description: String(e) });
    }
    setLoading(false);
    setConfirmDialog({ type: "", open: false });
  }

  const labels: Record<string, string> = {
    archive: "arquivar",
    delete: "mover para a lixeira",
    restore: "restaurar",
    purge: "excluir permanentemente",
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <Input placeholder="Pesquisar lembretes..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:max-w-xs" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue>{(v: any) => v === "all" || v == null ? "Todos" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {typesList.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue>{(v: any) => v === "all" || v == null ? "Todos" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <SortFilter
          value={sort}
          onChange={(v) => setSort(v ?? "dueDate|asc")}
          fields={[
            { value: "dueDate", label: "Vencimento" },
            { value: "title", label: "Título" },
          ]}
          triggerLabel="Ordenar"
        />
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
            {view === "active" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ type: "archive", open: true })}>Arquivar</Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDialog({ type: "delete", open: true })}>Apagar</Button>
              </>
            )}
            {view === "archived" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirmDialog({ type: "restore", open: true })}>Restaurar</Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDialog({ type: "delete", open: true })}>Apagar</Button>
              </>
            )}

          </div>
        )}
      </div>


      {view !== "trash" && (
      <div className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto mb-2">
        {[
          { key: "active", label: "Ativos" },
          { key: "archived", label: "Arquivados" },
        ].map((t) => (
          <Link key={t.key} href={`/reminders?view=${t.key}`} className={`flex-1 sm:flex-none text-center px-3 py-1.5 text-sm rounded-md ${view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      )}

      <div className="max-h-[420px] overflow-x-auto border rounded-md">
        <Table className="min-w-[700px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer select-none"
                onPointerDown={(e) => onRowPointerDown(e, r.id)}
                onPointerMove={onRowPointerMove}
                onPointerUp={onRowPointerUp}
                onPointerCancel={onRowPointerUp}
                onPointerLeave={onRowPointerUp}
              >
                <TableCell onPointerDown={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                </TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="text-muted-foreground">{r.client?.name ?? "Cliente removido"}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal">{typeLabels[r.type] ?? r.type}</Badge></TableCell>
                <TableCell className="tabular-nums">{formatDate(new Date(r.dueDate))}</TableCell>
                <TableCell>{r.completed ? <Badge variant="secondary">Concluído</Badge> : <Badge>Pendente</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!r.completed && <Button size="sm" variant="ghost" onClick={async () => { await completeReminderAction(r.id); router.refresh(); }}><CheckCircle2 className="h-4 w-4" /></Button>}
                    {r.completed && <Button size="sm" variant="ghost" onClick={async () => { await uncompleteReminderAction(r.id); router.refresh(); }}>↩</Button>}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum lembrete encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}

      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo lembrete</Button>
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
                <SelectTrigger><SelectValue>{typeLabels[form.type] ?? form.type}</SelectValue></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t} value={t}>{typeLabels[t] ?? t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.clientId} onValueChange={(v: string | null) => setForm({ ...form, clientId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Selecione">{clientList.find((c) => c.id === form.clientId)?.name ?? "Selecione"}</SelectValue></SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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

      <Dialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog((prev) => ({ ...prev, open: o }))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirmar ação</DialogTitle></DialogHeader>
          <p className="text-sm">Deseja {labels[confirmDialog.type]} {selected.size} item(ns)?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ type: "", open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={runAction} disabled={loading}>{loading ? "Processando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir lembrete</DialogTitle></DialogHeader>
          <p className="text-sm">Deseja excluir este lembrete?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
