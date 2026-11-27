"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpAZ, ArrowDownZA, Text, CalendarFold, ChartNoAxesGantt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SortField = { value: string; label: string; icon?: LucideIcon };
export type SortFilterProps = {
  value: string; // "field|dir"
  onChange: (value: string | null) => void;
  fields: SortField[];
  triggerLabel?: string;
};

export function SortFilter({ value, onChange, fields, triggerLabel = "Ordenar" }: SortFilterProps) {
  const [field, dir] = value.split("|");
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-[170px]">
        <div className="flex gap-2 items-center">
          <ChartNoAxesGantt size={15} />
          <SelectValue placeholder={triggerLabel}>{triggerLabel}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1 text-sm font-medium text-muted-foreground">Ordenar Por</div>
        <div className="space-y-1">
          {fields.map((f) => {
            const Icon = f.icon ?? Text;
            return (
              <SelectItem key={f.value} value={`${f.value}|${dir}`}>
                <div className="flex gap-2 items-center">
                  <Icon size={15} /> {f.label}
                </div>
              </SelectItem>
            );
          })}
        </div>
        <div className="px-2 py-1 text-sm font-medium text-muted-foreground">Direção</div>
        <div className="space-y-1">
          <SelectItem value={`${field}|asc`}>
            <div className="flex gap-2 items-center">
              <ArrowUpAZ size={15} /> Crescente
            </div>
          </SelectItem>
          <SelectItem value={`${field}|desc`}>
            <div className="flex gap-2 items-center">
              <ArrowDownZA size={15} /> Decrescente
            </div>
          </SelectItem>
        </div>
      </SelectContent>
    </Select>
  );
}
