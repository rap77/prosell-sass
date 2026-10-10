"use client";

/**
 * LeadCreateDialog — manual lead creation from the leads inbox.
 * Self-contained: trigger button ("Nuevo lead") + dialog with the form.
 *
 * The POST /api/v1/leads call is gated server-side by the `leads:create`
 * zone action; this component only validates buyer_name locally and posts
 * the CreateLeadRequest payload. Errors are surfaced by the hook's central
 * toast handling (mandate Q6); the dialog stays open on failure so the
 * entered data is not lost.
 */

import { useState } from "react";
import { useCreateLead } from "@/lib/api/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadCreateDialog() {
  const [open, setOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const createLead = useCreateLead();

  function resetForm() {
    setBuyerName("");
    setBuyerEmail("");
    setBuyerPhone("");
    setMessage("");
    setNameError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buyerName.trim()) {
      setNameError("El nombre del comprador es obligatorio");
      return;
    }
    try {
      await createLead.mutateAsync({
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim() || null,
        buyer_phone: buyerPhone.trim() || null,
        message: message.trim() || null,
      });
      setOpen(false);
      resetForm();
    } catch {
      // Error toast is already surfaced by the hook (onError).
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="h-9 gap-1.5 px-3.5 text-[13px] font-semibold"
      >
        <Plus size={14} strokeWidth={2.5} />
        Nuevo lead
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuevo lead</DialogTitle>
            <DialogDescription>
              Cargá los datos del prospecto. Solo el nombre es obligatorio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-buyer-name">Nombre</Label>
              <Input
                id="lead-buyer-name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nombre del comprador"
                aria-invalid={nameError ? true : undefined}
              />
              {nameError ? (
                <p className="text-ps-error text-xs">{nameError}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-buyer-email">Email</Label>
              <Input
                id="lead-buyer-email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="comprador@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-buyer-phone">Teléfono</Label>
              <Input
                id="lead-buyer-phone"
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+54 9 11 0000 0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-message">Mensaje</Label>
              <Textarea
                id="lead-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Vehículo de interés o consulta..."
                className={cn("min-h-[70px]")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
