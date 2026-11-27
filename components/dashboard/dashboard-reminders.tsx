"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteReminderAction } from "@/app/actions/reminders";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/date-utils";

export function DashboardReminders({ reminders }: { reminders: any[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Excluir lembrete?")) return;
    setDeleting(id);
    await deleteReminderAction(id);
    setDeleting(null);
    toast.add({ title: "Excluído" });
    router.refresh();
  }

  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-2">Nenhum lembrete cadastrado.</p>;
  }

  return (
    <div className="space-y-2">
      {reminders.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between gap-3 text-sm px-1 py-1.5 rounded-md hover:bg-muted/50">
          <Link href="/reminders" className="min-w-0 flex-1">
            <div className="font-medium truncate">{r.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {r.dueDate ? new Date(r.dueDate).toLocaleDateString("pt-BR") : ""} {r.message ? `· ${r.message}` : ""}
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => window.location.href = "/reminders"}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
