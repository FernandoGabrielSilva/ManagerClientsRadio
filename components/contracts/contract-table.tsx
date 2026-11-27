"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortFilter } from "@/components/ui/sort-filter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/date-utils";
import { differenceInDays } from "date-fns";
import { toast } from "@/components/ui/toast";
import { archiveContractsAction, deleteContractsAction, restoreContractsAction, permanentDeleteContractsAction } from "@/app/actions/contracts";
import { ContractForm } from "@/components/contracts/contract-form";
import { Pencil } from "lucide-react";

const PAGE_SIZE = 10;

export function ContractTable({ contracts, clients = [], view = "active" }: { contracts: any[]; clients?: { id: string; name: string }[]; view?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("endDate|asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ type: string; open: boolean }>({ type: "", open: false });
  const [editContract, setEditContract] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  const types = useMemo(() => Array.from(new Set(contracts.map((c) => c.mediaType as string).filter(Boolean))), [contracts]);

  function contractStatus(c: any) {
    const days = differenceInDays(new Date(c.endDate), new Date());
    return days < 0 ? "Vencido" : days <= 30 ? "Perto de Vencer" : "Ativo";
  }

  const filtered = contracts
    .filter((c) => {
      const q = query.trim().toLowerCase();
      if (q && ![c.number, c.client?.name, c.sellerName, c.vendor?.name, c.mediaType, c.status].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
      if (typeFilter !== "all" && c.mediaType !== typeFilter) return false;
      if (statusFilter !== "all" && contractStatus(c) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const [field, dir] = sort.split("|");
      let cmp = 0;
      if (field === "client") cmp = String(a.client?.name ?? "").localeCompare(String(b.client?.name ?? ""));
      else if (field === "startDate") cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      else if (field === "value") cmp = (a.value ?? 0) - (b.value ?? 0);
      else cmp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      return dir === "desc" ? -cmp : cmp;
    });

  useEffect(() => { setPage(1); }, [query, typeFilter, statusFilter]);

  if (contracts.length === 0) {
    return <div className="border rounded-lg p-8 text-sm text-muted-foreground text-center">Nenhum contrato cadastrado.</div>;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allSelected = paged.length > 0 && paged.every((c) => selected.has(c.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) paged.forEach((c) => next.delete(c.id));
    else paged.forEach((c) => next.add(c.id));
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
  function onRowClick(id: string) {
    if (longPressFired.current) { longPressFired.current = false; return; }
    if (selected.size > 0) { toggle(id); return; }
    router.push(`/contracts/${id}`);
  }

  const labels: Record<string, string> = {
    archive: "arquivar",
    delete: "mover para a lixeira",
    restore: "restaurar",
    purge: "excluir permanentemente",
  };

  async function runAction() {
    setLoading(true);
    const ids = [...selected];
    try {
      if (confirm.type === "archive") await archiveContractsAction(ids);
      else if (confirm.type === "delete") await deleteContractsAction(ids);
      else if (confirm.type === "restore") await restoreContractsAction(ids);
      else if (confirm.type === "purge") await permanentDeleteContractsAction(ids);
      toast.add({ title: "Concluído" });
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.add({ title: "Erro", description: String(e) });
    }
    setLoading(false);
    setConfirm({ type: "", open: false });
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <Input placeholder="Pesquisar contratos..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:max-w-xs" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue>{(v: any) => v === "all" || v == null ? "Todos" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue>{(v: any) => v === "all" || v == null ? "Todos" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Perto de Vencer">Perto de Vencer</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <SortFilter
          value={sort}
          onChange={(v) => setSort(v ?? "endDate|asc")}
          fields={[
            { value: "endDate", label: "Término" },
            { value: "startDate", label: "Início" },
            { value: "client", label: "Cliente" },
            { value: "value", label: "Valor" },
          ]}
          triggerLabel="Ordenar"
        />
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
            {view === "active" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "archive", open: true })}>Arquivar</Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: "delete", open: true })}>Apagar</Button>
              </>
            )}
            {view === "archived" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "restore", open: true })}>Restaurar</Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: "delete", open: true })}>Apagar</Button>
              </>
            )}
            {view === "trash" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "restore", open: true })}>Restaurar</Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: "purge", open: true })}>Excluir permanentemente</Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="max-h-[420px] overflow-x-auto border rounded-md">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="text-right">Término</TableHead>
              <TableHead className="text-right">Dias</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((c) => {
              const days = differenceInDays(new Date(c.endDate), new Date());
              const status = days < 0 ? "Vencido" : days <= 30 ? "Perto de Vencer" : "Ativo";
              const variant = days < 0 ? "destructive" : days <= 30 ? "secondary" : "outline";
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer select-none"
                  onClick={() => onRowClick(c.id)}
                  onPointerDown={(e) => onRowPointerDown(e, c.id)}
                  onPointerMove={onRowPointerMove}
                  onPointerUp={onRowPointerUp}
                  onPointerCancel={onRowPointerUp}
                  onPointerLeave={onRowPointerUp}
                  onContextMenu={(e) => { if (longPressTimer.current || selected.size > 0) e.preventDefault(); }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{c.number ?? "—"}</TableCell>
                  <TableCell>{c.client?.name ?? "—"}</TableCell>
                  <TableCell>{c.sellerName ?? c.vendor?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.program ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.mediaType}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.value != null ? `R$ ${Number(c.value).toLocaleString("pt-BR")}` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{formatDate(c.startDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDate(c.endDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{days}</TableCell>
                  <TableCell><Badge variant={variant as any} className="font-normal">{status}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setEditContract(c)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <div className="border rounded-lg p-8 text-sm text-muted-foreground text-center">Nenhum contrato encontrado.</div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} ({filtered.length} itens)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
          </div>
        </div>
      )}

      <Dialog open={!!editContract} onOpenChange={(o) => { if (!o) setEditContract(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar contrato</DialogTitle></DialogHeader>
          {editContract && <ContractForm clients={clients} contract={editContract} onSuccess={() => setEditContract(null)} onCancel={() => setEditContract(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={confirm.open} onOpenChange={(o) => setConfirm((prev) => ({ ...prev, open: o }))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirmar ação</DialogTitle></DialogHeader>
          <p className="text-sm">Deseja {labels[confirm.type]} {selected.size} item(ns)?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm({ type: "", open: false })}>Cancelar</Button>
            <Button variant="destructive" onClick={runAction} disabled={loading}>{loading ? "Processando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
