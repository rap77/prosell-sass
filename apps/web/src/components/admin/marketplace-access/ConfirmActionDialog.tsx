/**
 * Reusable confirmation dialog for marketplace access actions.
 * Consolidates Reject and Revoke dialogs to eliminate duplication.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  variant?: "destructive" | "default";
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  reason,
  onReasonChange,
  onConfirm,
  isPending,
  variant = "destructive",
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (requerido)</Label>
            <Textarea
              id="reason"
              placeholder="Explicá por qué se está tomando esta acción..."
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? "Procesando..." : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
