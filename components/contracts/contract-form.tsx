"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractSchema } from "@/lib/validators";
import { createContractAction, updateContractAction } from "@/app/actions/contracts";
import { getActiveClientsAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

type Values = z.infer<typeof contractSchema>;

export function ContractForm({ clients: initialClients, contract, onSuccess, onCancel }: { clients: { id: string; name: string }[]; contract?: any; onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  useEffect(() => {
    getActiveClientsAction().then((c) => { if (Array.isArray(c) && c.length) setClients(c); }).catch(() => {});
  }, []);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(contractSchema),
    defaultValues: contract
      ? {
          number: contract.number ?? "",
          clientId: contract.clientId ?? contract.client?.id ?? "",
          sellerName: contract.sellerName ?? "",
          program: contract.program ?? "",
          startDate: contract.startDate ? new Date(contract.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          durationMonths: contract.durationMonths ?? 3,
          endDate: contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : "",
          mediaType: contract.mediaType ?? "Spot 30s",
          insertionsPerDay: contract.insertionsPerDay ?? null,
          insertionsPerMonth: contract.insertionsPerMonth ?? contract.insertions ?? null,
          timeSlots: contract.timeSlots ?? "",
          value: contract.value ?? null,
          totalValue: contract.totalValue ?? null,
          paymentInfo: contract.paymentInfo ?? "",
          notes: contract.notes ?? "",
        }
      : {
          mediaType: "Spot 30s",
          startDate: new Date().toISOString().slice(0, 10),
          durationMonths: 3,
          endDate: "",
          sellerName: "",
        },
  });

  async function onSubmit(values: Values) {
    const res = contract
      ? await updateContractAction(contract.id, values)
      : await createContractAction(values);
    if (res?.error) { toast.add({ title: "Erro", description: res.error }); return; }
    if (onSuccess) { onSuccess(); router.refresh(); return; }
    router.push("/contracts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nº Contrato / PI</Label>
          <Input {...register("number")} placeholder="Ex: PI 18/2026" />
        </div>
        <div className="space-y-2">
          <Label>Cliente / Anunciante *</Label>
          <Select value={watch("clientId")} onValueChange={(v: string | null) => setValue("clientId", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Vendedor Responsável</Label>
          <Input {...register("sellerName")} placeholder="Nome do vendedor" />
        </div>
        <div className="space-y-2">
          <Label>Programa / Faixa</Label>
          <Input {...register("program")} placeholder="Ex: Institucional / Ofertas" />
        </div>
        <div className="space-y-2">
          <Label>Data de Início *</Label>
          <Input type="date" {...register("startDate")} />
          {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Duração (meses)</Label>
          <Input type="number" min={0} {...register("durationMonths", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Data de Término</Label>
          <Input type="date" {...register("endDate")} />
          <p className="text-xs text-muted-foreground">Deixe em branco para calcular pela duração.</p>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Mídia *</Label>
          <Input {...register("mediaType")} placeholder="Ex: Spot 30s + Testemunhal 60s" />
          {errors.mediaType && <p className="text-sm text-destructive">{errors.mediaType.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Qtd. Inserções / Dia</Label>
          <Input type="number" min={0} {...register("insertionsPerDay", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Total Inserções / Mês</Label>
          <Input type="number" min={0} {...register("insertionsPerMonth", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Horários de Veiculação</Label>
          <Input {...register("timeSlots")} placeholder="Ex: 08:00, 12:00, 18:00" />
        </div>
        <div className="space-y-2">
          <Label>Valor Mensal (R$)</Label>
          <Input type="number" step="0.01" {...register("value", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Valor Total / Valor Bruto (R$)</Label>
          <Input type="number" step="0.01" {...register("totalValue", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Pagamento / Vencimento</Label>
          <Input {...register("paymentInfo")} placeholder="Ex: Dia 19 de cada mês — Pix / Boleto" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Observações de Veiculação</Label>
        <Textarea rows={3} {...register("notes")} />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => (onCancel ? onCancel() : router.back())}>Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : (contract ? "Atualizar" : "Salvar")}</Button>
      </div>
    </form>
  );
}
