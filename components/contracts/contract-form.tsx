"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractSchema } from "@/lib/validators";
import { createContractAction } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

type Values = z.infer<typeof contractSchema>;

export function ContractForm({ clients, onSuccess, onCancel }: { clients: { id: string; name: string }[]; onSuccess?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(contractSchema),
    defaultValues: { mediaType: "spot", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), sellerName: "" },
  });

  async function onSubmit(values: Values) {
    const res = await createContractAction(values);
    if (res?.error) { toast.add({ title: "Erro", description: res.error }); return; }
    if (onSuccess) { onSuccess(); router.refresh(); return; }
    router.push("/contracts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Número do contrato</Label>
          <Input {...register("number")} />
        </div>
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={watch("clientId")} onValueChange={(v: string | null) => setValue("clientId", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Vendedor</Label>
          <Input {...register("sellerName")} placeholder="Nome do vendedor" />
        </div>
        <div className="space-y-2">
          <Label>Tipo de mídia</Label>
          <Select value={watch("mediaType")} onValueChange={(v: string | null) => setValue("mediaType", (v ?? "spot") as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spot">Spot</SelectItem>
              <SelectItem value="sponsorship">Patrocínio</SelectItem>
              <SelectItem value="testimonial">Testemunhal</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Início</Label>
          <Input type="date" {...register("startDate")} />
        </div>
        <div className="space-y-2">
          <Label>Término</Label>
          <Input type="date" {...register("endDate")} />
        </div>
        <div className="space-y-2">
          <Label>Quantidade de inserções</Label>
          <Input type="number" {...register("insertions", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Valor</Label>
          <Input type="number" step="0.01" {...register("value", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Horários</Label>
          <Input {...register("timeSlots")} placeholder="Ex: 08:00, 12:00, 18:00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea rows={3} {...register("notes")} />
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => (onCancel ? onCancel() : router.back())}>Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
