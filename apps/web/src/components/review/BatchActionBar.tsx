import { Button } from "@/components/ui/button";

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

export function BatchActionBar({
  selectedCount,
  onClear,
  onApprove,
  onReject,
  isLoading,
}: BatchActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-ps-border-default bg-ps-surface p-4 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <span className="text-sm text-ps-text-secondary">
          {selectedCount}{" "}
          {selectedCount === 1
            ? "producto seleccionado"
            : "productos seleccionados"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={isLoading}
            className="border-ps-border-default text-ps-text-primary hover:bg-ps-elevated"
          >
            Limpiar selección
          </Button>
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
            className="border-ps-border-default text-ps-text-primary hover:bg-ps-elevated"
          >
            Rechazar
          </Button>
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="bg-ps-cyan text-ps-base hover:bg-ps-cyan-hover"
          >
            {isLoading ? "Procesando..." : "Aprobar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
