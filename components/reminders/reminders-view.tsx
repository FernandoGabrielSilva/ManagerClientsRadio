"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
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
import { reminderSchema } from "@/lib/validators";

type ReminderValues = z.infer<typeof reminderSchema>;

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
  const [clientList, setClientList] = useState(clients);
  const [busyId, setBusyId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReminderValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { title: "", message: "", dueDate: "", type: "custom", clientId: "" },
  });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = paged.length > 0 && paged.every((r) => selected.has(r.id));
  const someSelected = paged.some((r) => selected.has(r.id)) && !allSelected;

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
    longPressStart.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
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
    reset({ title: "", message: "", dueDate: "", type: "custom", clientId: "" });
    setEditing(null);
  }

  function openCreate() { resetForm(); setOpen(true); }
  function openEdit(r: Reminder) {
    setEditing(r);
    reset({
      title: r.title,
      message: r.message ?? "",
      dueDate: new Date(r.dueDate).toISOString().slice(0, 10),
      type: r.type as ReminderValues["type"],
      clientId: r.clientId ?? "",
    });
    setOpen(true);
  }

  const submitForm = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const res = editing
        ? await updateReminderAction(editing.id, values)
        : await createReminderAction(values);
      if (res?.error) { toast.add({ title: "Erro", description: res.error }); return; }
      toast.add({ title: "Concluído" });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado" });
    } finally {
      setLoading(false);
    }
  });

  async function handleDelete(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteRemindersAction([deleteId]);
      toast.add({ title: "Excluído" });
      setDeleteOpen(false);
      setDeleteId(null);
      router.refresh();
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado" });
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete(r: Reminder) {
    setBusyId(r.id);
    try {
      if (r.completed) await uncompleteReminderAction(r.id);
      else await completeReminderAction(r.id);
      router.refresh();
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado" });
    } finally {
      setBusyId(null);
    }
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
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado" });
    } finally {
      setLoading(false);
      setConfirmDialog({ type: "", open: false });
    }
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
        <Input
          type="search"
          aria-label="Pesquisar lembretes"
          placeholder="Pesquisar lembretes..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="w-full sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger aria-label="Filtrar por tipo" className="w-full sm:w-40"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {typesList.map((t) => <SelectItem key={t} value={t}>{typeLabels[t] ?? t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger aria-label="Filtrar por status" className="w-full sm:w-40"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <SortFilter
          value={sort}
          onChange={(v) => { setSort(v ?? "dueDate|asc"); setPage(1); }}
          fields={[
            { value: "dueDate", label: "Vencimento" },
            { value: "title", label: "Título" },
          ]}
          triggerLabel="Ordenar"
        />
        <Button onClick={openCreate} className="w-full sm:w-auto sm:ml-auto"><Plus className="h-4 w-4 mr-2" />Novo lembrete</Button>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
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
      <nav aria-label="Visão de lembretes" className="flex items-center gap-1 rounded-lg border p-1 w-full sm:w-auto mb-2">
        {[
          { key: "active", label: "Ativos" },
          { key: "archived", label: "Arquivados" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/reminders?view=${t.key}`}
            aria-current={view === t.key ? "page" : undefined}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 text-sm rounded-md ${view === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      )}

      <div
        className="max-h-[420px] overflow-auto border rounded-md [&_[data-slot=table-container]]:overflow-x-visible focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        role="region"
        aria-label="Lista de lembretes"
        tabIndex={0}
      >
        <Table className="min-w-[700px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Selecionar todos os lembretes desta página"
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                />
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
                className="select-none"
                onPointerDown={(e) => onRowPointerDown(e, r.id)}
                onPointerMove={onRowPointerMove}
                onPointerUp={onRowPointerUp}
                onPointerCancel={onRowPointerUp}
                onPointerLeave={onRowPointerUp}
              >
                <TableCell onPointerDown={(e) => e.stopPropagation()}>
                  <Checkbox
                    aria-label={`Selecionar lembrete ${r.title}`}
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="text-muted-foreground">{r.client?.name ?? "Cliente removido"}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal">{typeLabels[r.type] ?? r.type}</Badge></TableCell>
                <TableCell className="tabular-nums">{formatDate(new Date(r.dueDate))}</TableCell>
                <TableCell>{r.completed ? <Badge variant="secondary">Concluído</Badge> : <Badge>Pendente</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!r.completed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Concluir lembrete ${r.title}`}
                        disabled={busyId === r.id}
                        onClick={() => toggleComplete(r)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {r.completed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Reabrir lembrete ${r.title}`}
                        disabled={busyId === r.id}
                        onClick={() => toggleComplete(r)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label={`Editar lembrete ${r.title}`} onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Excluir lembrete ${r.title}`} onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar lembrete" : "Novo lembrete"}</DialogTitle></DialogHeader>
          <form onSubmit={submitForm} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Título *</Label>
              <Input
                id="reminder-title"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "reminder-title-error" : undefined}
                {...register("title")}
              />
              {errors.title && <p id="reminder-title-error" role="alert" className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-message">Mensagem</Label>
              <Textarea id="reminder-message" {...register("message")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-dueDate">Vencimento *</Label>
              <Input
                id="reminder-dueDate"
                type="date"
                aria-invalid={!!errors.dueDate}
                aria-describedby={errors.dueDate ? "reminder-dueDate-error" : undefined}
                {...register("dueDate")}
              />
              {errors.dueDate && <p id="reminder-dueDate-error" role="alert" className="text-sm text-destructive">{errors.dueDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Tipo</Label>
              <Select
                value={watch("type")}
                onValueChange={(v) => setValue("type", v as ReminderValues["type"])}
              >
                <SelectTrigger id="reminder-type"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t} value={t}>{typeLabels[t] ?? t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-clientId">Cliente</Label>
              <Select
                value={watch("clientId") ?? ""}
                onValueChange={(v) => setValue("clientId", v ?? "")}
              >
                <SelectTrigger id="reminder-clientId"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={loading || isSubmitting}>{loading || isSubmitting ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog((prev) => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>Deseja {labels[confirmDialog.type]} {selected.size} item(ns)?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={runAction} disabled={loading}>
              {loading ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete</AlertDialogTitle>
            <AlertDialogDescription>O lembrete será movido para a lixeira.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
