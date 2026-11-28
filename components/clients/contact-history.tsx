"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContactHistoryAction } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactHistory, User } from "@/generated/prisma/client";

export function ContactHistorySection({ clientId, histories }: { clientId: string; histories: (ContactHistory & { vendor: User | null })[] }) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!summary.trim()) return;
    setLoading(true);
    await addContactHistoryAction(clientId, summary);
    setSummary("");
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Histórico de contatos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo da conversa..." />
        <Button onClick={submit} disabled={loading}>{loading ? "Salvando..." : "Registrar contato"}</Button>
        <div className="space-y-2 mt-4">
          {histories.length === 0 && <p className="text-sm text-muted-foreground">Sem histórico.</p>}
          {histories.map((h) => (
            <div key={h.id} className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString("pt-BR")}</div>
              <div className="text-sm mt-1">{h.summary}</div>
              {h.vendor && <div className="text-xs text-muted-foreground mt-1">por {h.vendor.name}</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
