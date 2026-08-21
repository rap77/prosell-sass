"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useAvailableTransitions,
  useReverseProduct,
  useResubmitProduct,
  useRestoreProduct,
  useRevertSaleProduct,
  type AvailableTransition,
} from "@/lib/api/products";
import { SectionCard } from "./SectionCard";

const METHOD_LABEL: Record<AvailableTransition["method"], string> = {
  reverse_publication: "Revertir aprobación",
  resubmit: "Reenviar a revisión",
  restore: "Restaurar",
  revert_sale: "Deshacer venta",
};

const METHOD_DESCRIPTION: Record<AvailableTransition["method"], string> = {
  reverse_publication:
    "El producto vuelve a Pendiente y se solicita el retiro de sus publicaciones activas en Facebook.",
  resubmit: "El producto vuelve a Pendiente para una nueva revisión.",
  restore: "El producto vuelve al estado que tenía antes de ser archivado.",
  revert_sale:
    "El producto vuelve a Publicado y queda disponible de nuevo en el catálogo.",
};

interface AvailableTransitionsProps {
  productId: string;
  version: number;
}

/**
 * "Transiciones disponibles" — persistent, discoverable undo actions for
 * super_admin, replacing the spec's original "5s Deshacer toast" design
 * (no per-product approve/reject/archive confirm dialog exists to attach
 * a toast to; see the spec amendment for slice 10).
 *
 * Shown to every viewer (the backend endpoint allows any authenticated
 * user), but each action is disabled with an explanatory title for
 * non-super_admin viewers instead of being hidden — matches the
 * `requires_role` field's intent.
 */
export function AvailableTransitions({
  productId,
  version,
}: AvailableTransitionsProps) {
  const { isSuperAdmin } = useAuth();
  const [selected, setSelected] = useState<AvailableTransition | null>(null);
  const { data: transitions } = useAvailableTransitions(productId);
  const reverseProduct = useReverseProduct();
  const resubmitProduct = useResubmitProduct();
  const restoreProduct = useRestoreProduct();
  const revertSaleProduct = useRevertSaleProduct();

  if (!transitions || transitions.length === 0) return null;

  const mutationByMethod: Record<
    AvailableTransition["method"],
    typeof reverseProduct
  > = {
    reverse_publication: reverseProduct,
    resubmit: resubmitProduct,
    restore: restoreProduct,
    revert_sale: revertSaleProduct,
  };
  const isPending =
    reverseProduct.isPending ||
    resubmitProduct.isPending ||
    restoreProduct.isPending ||
    revertSaleProduct.isPending;

  async function confirm(): Promise<void> {
    if (!selected) return;
    try {
      await mutationByMethod[selected.method].mutateAsync({
        productId,
        version,
      });
      setSelected(null);
    } catch {
      // The mutation hook retains and toasts the server error.
    }
  }

  return (
    <>
      <SectionCard>
        <div className="mb-3.5">
          <h2 className="m-0 text-sm font-semibold text-ps-text-primary">
            Transiciones disponibles
          </h2>
          <p className="mt-[3px] m-0 text-xs text-ps-text-secondary">
            Deshacer decisiones anteriores sobre este producto.
          </p>
        </div>
        <div className="grid gap-2">
          {transitions.map((transition) => (
            <button
              key={transition.method}
              type="button"
              disabled={!isSuperAdmin}
              title={isSuperAdmin ? undefined : "Requiere rol super_admin"}
              onClick={() => setSelected(transition)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-ps-border-default bg-ps-elevated px-4 py-3 text-left text-sm font-medium text-ps-text-primary transition-colors hover:bg-ps-bg-elevated disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-cyan"
            >
              <RotateCcw
                className="size-4 shrink-0 text-ps-text-secondary"
                aria-hidden="true"
              />
              {METHOD_LABEL[transition.method]}
            </button>
          ))}
        </div>
      </SectionCard>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-[480px] border-ps-border-default bg-ps-surface sm:rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-ps-text-primary">
              {selected ? METHOD_LABEL[selected.method] : ""}
            </DialogTitle>
            <DialogDescription className="text-ps-text-secondary">
              {selected ? METHOD_DESCRIPTION[selected.method] : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              disabled={isPending}
              onClick={() => setSelected(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="touch"
              disabled={isPending}
              onClick={confirm}
              className="w-full bg-ps-cyan text-ps-base hover:bg-ps-cyan/90 sm:w-auto"
            >
              {isPending ? "Procesando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
