"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "@/lib/validators";
import { createClientAction, updateClientAction } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAYS, weekdayLabel } from "@/lib/date-utils";
import { OPTION_LISTS } from "@/lib/spreadsheet";
import { ChevronDown, User, Phone, Mail, MapPin, Briefcase, DollarSign, Calendar, MessageSquare, Tag } from "lucide-react";
import { z } from "zod";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

type Values = z.infer<typeof clientSchema>;

export function ClientForm({ client, vendors, onSuccess }: { client?: any; vendors?: { id: string; name: string | null }[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [daysOpen, setDaysOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          company: client.company,
          legalName: client.legalName,
          tradeName: client.tradeName,
          cnpj: client.cnpj,
          address: client.address,
          phone: client.phone,
          email: client.email,
          contactName: client.contactName,
          contactPhone: client.contactPhone,
          contactEmail: client.contactEmail,
          contactRole: client.contactRole,
          offeredMediaType: client.offeredMediaType,
          videoWeekday: client.videoWeekday,
          lastContactAt: client.lastContactAt ? new Date(client.lastContactAt).toISOString().slice(0, 10) : null,
          contactFrequencyDays: client.contactFrequencyDays,
          contractStatus: client.contractStatus,
          contractStart: client.contractStart ? new Date(client.contractStart).toISOString().slice(0, 10) : null,
          contractEnd: client.contractEnd ? new Date(client.contractEnd).toISOString().slice(0, 10) : null,
          contractValue: client.contractValue,
          contractTotalValue: client.contractTotalValue,
          notes: client.notes,
          lastVideoSentAt: client.lastVideoSentAt ? new Date(client.lastVideoSentAt).toISOString().slice(0, 10) : null,
          needsAdChange: client.needsAdChange,
          vendorId: client.vendorId,
          responsible: client.responsible,
          commercialStatus: client.commercialStatus,
          contactType: client.contactType,
          nextAction: client.nextAction,
          nextActionDate: client.nextActionDate ? new Date(client.nextActionDate).toISOString().slice(0, 10) : null,
          dateConference: client.dateConference ? new Date(client.dateConference).toISOString().slice(0, 10) : null,
        }
      : {
          name: "",
          videoWeekday: 1,
          contactFrequencyDays: 14,
          contractStatus: "active",
          needsAdChange: false,
          responsible: "",
          commercialStatus: "",
          contactType: "",
          offeredMediaType: "",
          nextAction: "",
          nextActionDate: null,
          dateConference: null,
        },
  });

  async function onSubmit(values: Values) {
    const res = client
      ? await updateClientAction(client.id, values)
      : await createClientAction(values);
    if (res?.error) {
      toast.add({ title: "Erro", description: res.error });
      return;
    }
    if (onSuccess) onSuccess();
    router.push(client ? `/clients/${client.id}` : "/clients");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Dados do cliente</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Razão Social</Label>
            <Input {...register("legalName")} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nome Fantasia / Cliente *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>CNPJ / CPF</Label>
            <Input {...register("cnpj")} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Endereço completo</Label>
            <Input {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp</Label>
            <Input {...register("phone", { onChange: (e) => { e.target.value = formatPhone(e.target.value); } })} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contato responsável</Label>
            <Input {...register("contactName")} />
          </div>
          <div className="space-y-2">
            <Label>Cargo / Setor</Label>
            <Input {...register("contactRole")} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Vendedor / Representante</Label>
            <Input {...register("responsible")} placeholder="Digite o nome" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tipo de mídia ofertada</Label>
            <Input {...register("offeredMediaType")} placeholder="Ex: Spot 30s + Testemunhal 60s" />
          </div>
          <div className="space-y-2">
            <Label>Situação comercial</Label>
            <Select value={watch("commercialStatus") ?? ""} onValueChange={(v: string | null) => setValue("commercialStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.commercialStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor mensal (R$)</Label>
            <Input type="number" step="0.01" {...register("contractValue", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor total (R$)</Label>
            <Input type="number" step="0.01" {...register("contractTotalValue", { valueAsNumber: true })} />
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Último contato</Label>
            <Input type="date" {...register("lastContactAt")} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Tipo de contato</Label>
            <Select value={watch("contactType") ?? ""} onValueChange={(v: string | null) => setValue("contactType", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.contactTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Dias do vídeo semanal</Label>
            <Popover open={daysOpen} onOpenChange={setDaysOpen}>
              <PopoverTrigger render={<Button type="button" variant="outline" className="w-full justify-between" />}>
                {(watch("videoWeekday") ?? 0) === 0 ? "Selecione os dias" : weekdayLabel(watch("videoWeekday") ?? 0)}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {WEEKDAYS.map((d, i) => {
                    const bit = 1 << i;
                    const selected = ((watch("videoWeekday") ?? 0) & bit) !== 0;
                    return (
                      <label key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => {
                            const cur = watch("videoWeekday") ?? 0;
                            setValue("videoWeekday", selected ? cur & ~bit : cur | bit);
                          }}
                        />
                        {d}
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Próximas ações</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Próxima ação</Label>
            <Select value={watch("nextAction") ?? ""} onValueChange={(v: string | null) => setValue("nextAction", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.nextActions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Data próxima ação</Label>
            <Input type="date" {...register("nextActionDate")} />
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Observações</h3>
        </div>
        <div className="space-y-2">
          <Label>Histórico / observações</Label>
          <Textarea rows={4} {...register("notes")} />
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
