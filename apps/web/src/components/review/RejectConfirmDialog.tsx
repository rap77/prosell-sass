import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RejectConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

export function RejectConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading,
}: RejectConfirmDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("El motivo de rechazo es obligatorio");
      return;
    }
    onConfirm(reason);
    setReason(""); // Clear for next time
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-ps-border-default bg-ps-surface">
        <DialogHeader>
          <DialogTitle className="text-ps-text-primary">
            Rechazar productos
          </DialogTitle>
          <DialogDescription className="text-ps-text-secondary">
            Este motivo se registrará en los {selectedCount} productos
            seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label
            htmlFor="rejection-reason"
            className="mb-2 block text-sm font-medium text-ps-text-primary"
          >
            Motivo de rechazo
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-ps-border-default bg-ps-elevated p-3 text-ps-text-primary placeholder:text-ps-text-tertiary focus:border-ps-cyan focus:outline-none focus:ring-1 focus:ring-ps-cyan"
            placeholder="Ej: Falta documentación del vehículo"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-ps-border-default text-ps-text-primary"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            variant="destructive"
          >
            {isLoading ? "Rechazando..." : "Confirmar rechazo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
