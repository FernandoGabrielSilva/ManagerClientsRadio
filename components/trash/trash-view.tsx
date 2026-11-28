"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "@/components/ui/toast";
import { restoreTrashItemsAction, purgeTrashItemsAction, type TrashItemRef } from "@/app/actions/trash";

type TrashItem = {
  id: string;
  kind: "client" | "contract" | "reminder";
  typeLabel: string;
  title: string;
  subtitle: string;
  deletedAt: string | Date;
};


export function TrashView({ items }: { items: TrashItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ type: string; open: boolean }>({ type: "", open: false });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filtered = items.filter((it) => {
    const q = query.trim().toLowerCase();
    if (q && ![it.title, it.subtitle, it.typeLabel].some((v) => String(v ?? "").toLowerCase().includes(q))) return false;
    if (typeFilter !== "all" && it.kind !== typeFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = paged.length > 0 && paged.every((it) => selected.has(it.id));
  const someSelected = paged.some((it) => selected.has(it.id)) && !allSelected;

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) paged.forEach((it) => next.delete(it.id));
    else paged.forEach((it) => next.add(it.id));
    setSelected(next);
  }
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function runAction() {
    setLoading(true);
    const refs: TrashItemRef[] = [...selected]
      .map((id) => items.find((it) => it.id === id))
      .filter(Boolean)
      .map((it) => ({ kind: it!.kind, id: it!.id }));
    try {
      if (confirm.type === "restore") await restoreTrashItemsAction(refs);
      else if (confirm.type === "purge") await purgeTrashItemsAction(refs);
      toast.add({ title: "Concluído" });
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado." });
    } finally {
      setLoading(false);
      setConfirm({ type: "", open: false });
    }
  }

  if (items.length === 0) {
    return <div className="border rounded-lg p-10 text-sm text-muted-foreground text-center">Lixeira vazia.</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <Input
          type="search"
          aria-label="Pesquisar na lixeira"
          placeholder="Pesquisar na lixeira..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          className="w-full sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="client">Clientes</SelectItem>
            <SelectItem value="contract">Contratos</SelectItem>
            <SelectItem value="reminder">Lembretes</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "restore", open: true })}>Restaurar</Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: "purge", open: true })}>Excluir permanentemente</Button>
          </div>
        )}
      </div>

      <div
        className="max-h-[420px] overflow-auto border rounded-md [&_[data-slot=table-container]]:overflow-x-visible focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        role="region"
        aria-label="Lista da lixeira"
        tabIndex={0}
      >
        <Table className="min-w-[700px] w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos os itens desta página"
                />
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Detalhe</TableHead>
              <TableHead>Excluído em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(it.id)}
                    onCheckedChange={() => toggle(it.id)}
                    aria-label={`Selecionar ${it.typeLabel}: ${it.title}`}
                  />
                </TableCell>
                <TableCell><Badge variant="outline">{it.typeLabel}</Badge></TableCell>
                <TableCell className="font-medium">{it.title}</TableCell>
                <TableCell className="text-muted-foreground">{it.subtitle}</TableCell>
                <TableCell className="tabular-nums">{new Date(it.deletedAt).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum item encontrado.</TableCell></TableRow>
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

      <AlertDialog open={confirm.open} onOpenChange={(o) => setConfirm((prev) => ({ ...prev, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja {confirm.type === "restore" ? "restaurar" : "excluir permanentemente"} {selected.size} item(ns)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={runAction} disabled={loading}>
              {loading ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
