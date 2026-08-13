import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ApproveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ApproveConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading,
}: ApproveConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-ps-border-default bg-ps-surface">
        <DialogHeader>
          <DialogTitle className="text-ps-text-primary">
            Aprobar productos
          </DialogTitle>
          <DialogDescription className="text-ps-text-secondary">
            Vas a aprobar {selectedCount}{" "}
            {selectedCount === 1 ? "producto" : "productos"}. Los productos
            aprobados estarán disponibles en el catálogo de ProSell.
          </DialogDescription>
        </DialogHeader>
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
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-ps-cyan text-ps-base hover:bg-ps-cyan-hover"
          >
            {isLoading ? "Aprobando..." : "Confirmar aprobación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
