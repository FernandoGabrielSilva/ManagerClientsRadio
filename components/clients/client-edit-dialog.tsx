"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { ClientForm } from "@/components/clients/client-form";

export function ClientEditDialog({ client, vendors }: { client: any; vendors: { id: string; name: string | null }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <ClientForm client={client} vendors={vendors} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
