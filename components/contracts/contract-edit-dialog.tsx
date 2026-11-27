"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { ContractForm } from "@/components/contracts/contract-form";

export function ContractEditDialog({ contract, clients }: { contract: any; clients: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar contrato</DialogTitle></DialogHeader>
          <ContractForm clients={clients} contract={contract} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
