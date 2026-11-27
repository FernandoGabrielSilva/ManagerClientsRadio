"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ContractDaysFilter({
  days,
  options,
}: {
  days: number;
  options: readonly number[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Dias para vencer</span>
      <Select
        value={String(days)}
        onValueChange={(value) =>
          router.replace(`${pathname}?dias=${value}`, { scroll: false })
        }
      >
        <SelectTrigger className="h-8 w-[80px]" aria-label="Dias para vencer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
