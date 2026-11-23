"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { nextContactDate, formatDate, weekdayLabel } from "@/lib/date-utils";
import { isContactOverdue } from "@/lib/date-utils";
import { toast } from "@/components/ui/toast";
import { archiveClientsAction, deleteClientsAction, restoreClientsAction, permanentDeleteClientsAction } from "@/app/actions/clients";
import type { Client } from "@prisma/client";
type ClientRow = Client & { vendor?: { name: string | null } | null };

const PAGE_SIZE = 10;

export function ClientsTable({ clients, view = "active" }: { clients: ClientRow[]; view?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ type: string; open: boolean }>({ type: "", open: false });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const statuses = useMemo(() => Array.from(new Set(clients.map((c) => (c.commercialStatus ?? c.contractStatus) as string).filter(Boolean))), [clients]);
  const vendors = useMemo(() => Array.from(new Set(clients.map((c) => (c.responsible ?? c.vendor?.name ?? "") as string).filter(Boolean))), [clients]);

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (q && ![c.name, c.responsible, c.commercialStatus, c.contactName, c.phone, c.email].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
    if (statusFilter !== "all" && (c.commercialStatus ?? c.contractStatus) !== statusFilter) return false;
    if (vendorFilter !== "all" && (c.responsible ?? c.vendor?.name) !== vendorFilter) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [query, statusFilter, vendorFilter]);

  if (clients.length === 0) {
    return <div className="border rounded-lg p-10 text-sm text-muted-foreground text-center">Nenhum cliente cadastrado.</div>;
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
      if (confirm.type === "archive") await archiveClientsAction(ids);
      else if (confirm.type === "delete") await deleteClientsAction(ids);
      else if (confirm.type === "restore") await restoreClientsAction(ids);
      else if (confirm.type === "purge") await permanentDeleteClientsAction(ids);
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
        <Input placeholder="Pesquisar clientes..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue>{(v: any) => v === "all" || v == null ? "Todas" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas situações</SelectItem>
            {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={(v) => setVendorFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue>{(v: any) => v === "all" || v == null ? "Todos" : v}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {vendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <Table className="min-w-[760px] w-max">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Cliente / anunciante</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Situação comercial</TableHead>
              <TableHead>Vídeo</TableHead>
              <TableHead>Último contato</TableHead>
              <TableHead className="text-right">Próximo contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.responsible ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal">{c.commercialStatus ?? c.contractStatus}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{weekdayLabel(c.videoWeekday)}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{formatDate(c.lastContactAt)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDate(nextContactDate(c.lastContactAt, c.contactFrequencyDays))}
                  {isContactOverdue(c.lastContactAt, c.contactFrequencyDays) && <span className="ml-2 text-destructive text-xs">atrasado</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <div className="border rounded-lg p-10 text-sm text-muted-foreground text-center">Nenhum cliente encontrado.</div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} ({filtered.length} itens)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
          </div>
        </div>
      )}

      <Dialog open={confirm.open} onOpenChange={(o) => setConfirm((prev) => ({ ...prev, open: o }))}>
        <DialogContent>
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
