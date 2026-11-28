"use client";

import { useRef, useState } from "react";
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
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
        reader.readAsDataURL(file);
      });
      const res = await updateContractPdfAction(contractId, b64, file.name);
      if (res && typeof res === "object" && "error" in res && res.error) {
        toast.add({ title: "Erro", description: String(res.error) });
      } else {
        toast.add({ title: "PDF anexado" });
        if (ref.current) ref.current.value = "";
      }
    } catch (error) {
      toast.add({ title: "Erro", description: error instanceof Error ? error.message : "Erro inesperado." });
    } finally {
      setLoading(false);
    }
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
