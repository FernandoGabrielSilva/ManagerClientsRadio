"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteReminderAction } from "@/app/actions/reminders";
import { toast } from "@/components/ui/toast";

type DashboardReminder = {
  id: string;
  title: string;
  message?: string | null;
  dueDate?: Date | string | null;
};

export function DashboardReminders({ reminders }: { reminders: DashboardReminder[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleting(id);
    try {
      const res = await deleteReminderAction(id);
      if (!res?.success) {
        toast.add({ title: "Erro", description: "Não foi possível excluir o lembrete." });
        return;
      }
      setDeleteId(null);
      toast.add({ title: "Excluído" });
      router.refresh();
    } catch (error) {
      toast.add({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setDeleting(null);
    }
  }

  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-2">Nenhum lembrete cadastrado.</p>;
  }

  return (
    <div className="space-y-2">
      {reminders.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-3 text-sm px-1 py-1.5 rounded-md hover:bg-muted/50"
        >
          <Link href="/reminders" className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="font-medium truncate">{r.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {r.dueDate ? new Date(r.dueDate).toLocaleDateString("pt-BR") : ""}
              {r.message ? ` · ${r.message}` : ""}
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Editar lembrete ${r.title}`}
              onClick={() => router.push("/reminders")}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Excluir lembrete ${r.title}`}
              onClick={() => setDeleteId(r.id)}
              disabled={deleting === r.id}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lembrete</AlertDialogTitle>
            <AlertDialogDescription>Deseja excluir este lembrete? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting !== null}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
