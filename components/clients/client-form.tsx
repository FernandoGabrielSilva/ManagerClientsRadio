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
import { WEEKDAYS, weekdayLabel, nextContactDate } from "@/lib/date-utils";
import { OPTION_LISTS } from "@/lib/spreadsheet";
import { ChevronDown, User, Phone, Mail, MapPin, Briefcase, DollarSign, Calendar, MessageSquare, Tag } from "lucide-react";
import { z } from "zod";
import type { Client } from "@/generated/prisma/client";

function formatCpfCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function formatCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = Number(digits) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

type Values = z.infer<typeof clientSchema>;

export function ClientForm({ client, onSuccess, onCancel }: { client?: Client; vendors?: { id: string; name: string | null }[]; onSuccess?: () => void; onCancel?: () => void }) {
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
          videoFrequency: client.videoFrequency === "monthly" ? "monthly" : "weekly",
          videoWeekday: client.videoWeekday ?? 0,
          lastContactAt: client.lastContactAt ? new Date(client.lastContactAt).toISOString().slice(0, 10) : null,
          nextContactAt: client.nextContactAt
            ? new Date(client.nextContactAt).toISOString().slice(0, 10)
            : client.lastContactAt
              ? nextContactDate(new Date(client.lastContactAt), client.contactFrequencyDays ?? 14).toISOString().slice(0, 10)
              : null,
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
          videoFrequency: "weekly",
          videoWeekday: 0,
          nextContactAt: null,
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

  const videoFrequency = watch("videoFrequency") ?? "weekly";
  const videoWeekday = watch("videoWeekday") ?? 0;

  async function onSubmit(values: Values) {
    const res = client
      ? await updateClientAction(client.id, values)
      : await createClientAction(values);
    if (res?.error) {
      toast.add({ title: "Erro", description: res.error });
      return;
    }
    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
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
            <Label htmlFor="legalName">Razão Social</Label>
            <Input id="legalName" {...register("legalName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nome Fantasia / Cliente *</Label>
            <Input id="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} {...register("name")} />
            {errors.name && <p id="name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ / CPF</Label>
            <Input id="cnpj" {...register("cnpj", { onChange: (e) => { e.target.value = formatCpfCnpj(e.target.value); } })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Endereço completo</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp</Label>
            <Input id="phone" {...register("phone", { onChange: (e) => { e.target.value = formatPhone(e.target.value); } })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
            {errors.email && <p id="email-error" role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName" className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contato responsável</Label>
            <Input id="contactName" {...register("contactName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactRole">Cargo / Setor</Label>
            <Input id="contactRole" {...register("contactRole")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsible" className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Vendedor / Representante</Label>
            <Input id="responsible" {...register("responsible")} placeholder="Digite o nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offeredMediaType" className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tipo de mídia ofertada</Label>
            <Input id="offeredMediaType" {...register("offeredMediaType")} placeholder="Ex: Spot 30s + Testemunhal 60s" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commercialStatus">Situação comercial</Label>
            <Select value={watch("commercialStatus") ?? ""} onValueChange={(v: string | null) => setValue("commercialStatus", v)}>
              <SelectTrigger id="commercialStatus"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.commercialStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractValue" className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor mensal (R$)</Label>
            <Input
              id="contractValue"
              value={watch("contractValue") != null ? Number(watch("contractValue")).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
              onChange={(e) => {
                const formatted = formatCurrency(e.target.value);
                e.target.value = formatted;
                const digits = e.target.value.replace(/\D/g, "");
                setValue("contractValue", digits ? Number(digits) / 100 : null);
              }}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractTotalValue" className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor total (R$)</Label>
            <Input
              id="contractTotalValue"
              value={watch("contractTotalValue") != null ? Number(watch("contractTotalValue")).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
              onChange={(e) => {
                const formatted = formatCurrency(e.target.value);
                e.target.value = formatted;
                const digits = e.target.value.replace(/\D/g, "");
                setValue("contractTotalValue", digits ? Number(digits) / 100 : null);
              }}
              placeholder="0,00"
            />
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lastContactAt" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Último contato</Label>
            <Input id="lastContactAt" type="date" value={watch("lastContactAt") ?? ""} onChange={(e) => setValue("lastContactAt", e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactType" className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Tipo de contato</Label>
            <Select value={watch("contactType") ?? ""} onValueChange={(v: string | null) => setValue("contactType", v)}>
              <SelectTrigger id="contactType"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.contactTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoFrequency">Frequência do vídeo</Label>
            <Select
              value={videoFrequency}
              onValueChange={(v: string | null) => setValue("videoFrequency", v === "monthly" ? "monthly" : "weekly")}
            >
              <SelectTrigger id="videoFrequency">
                <SelectValue>
                  {(v: string | null) => (v === "monthly" ? "Mensal" : "Semanal")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {videoFrequency === "weekly" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="videoWeekday">Dias do vídeo semanal</Label>
              <Popover open={daysOpen} onOpenChange={setDaysOpen}>
                <PopoverTrigger render={<Button id="videoWeekday" type="button" variant="outline" className="w-full justify-between" />}>
                  {videoWeekday === 0 ? "Selecione os dias" : weekdayLabel(videoWeekday)}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1" role="group" aria-labelledby="videoWeekday">
                    {WEEKDAYS.map((d, i) => {
                      const bit = 1 << i;
                      const selected = (videoWeekday & bit) !== 0;
                      return (
                        <label key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
                          <Checkbox
                            checked={selected}
                            aria-label={d}
                            onCheckedChange={() => {
                              const cur = videoWeekday;
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
          )}
        </div>
        <div className="space-y-2 pt-2">
          <Label htmlFor="nextContactAt" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Data do próximo contato</Label>
          <Input id="nextContactAt" type="date" value={watch("nextContactAt") ?? ""} onChange={(e) => setValue("nextContactAt", e.target.value || null)} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Próximas ações</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nextAction" className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Próxima ação</Label>
            <Select value={watch("nextAction") ?? ""} onValueChange={(v: string | null) => setValue("nextAction", v)}>
              <SelectTrigger id="nextAction"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {OPTION_LISTS.nextActions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextActionDate" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Data próxima ação</Label>
            <Input id="nextActionDate" type="date" {...register("nextActionDate")} />
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-sm font-semibold text-foreground">Observações</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Histórico / observações</Label>
          <Textarea id="notes" rows={4} {...register("notes")} />
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => (onCancel ? onCancel() : router.back())}>Cancelar</Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
