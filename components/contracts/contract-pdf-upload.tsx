"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateContractPdfAction } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ContractPdfUpload({ contractId }: { contractId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const b64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.readAsDataURL(file);
    });
    await updateContractPdfAction(contractId, b64, file.name);
    setLoading(false);
    toast.add({ title: "PDF anexado" });
    if (ref.current) ref.current.value = "";
  }

  return (
    <>
      <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={loading}>
        {loading ? "Enviando..." : "Anexar PDF"}
      </Button>
    </>
  );
}
