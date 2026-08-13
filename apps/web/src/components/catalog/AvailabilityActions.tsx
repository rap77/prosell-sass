"use client";

import { useState } from "react";
import {
  ChevronDown,
  CirclePause,
  RotateCcw,
  Tag,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Permission } from "@/lib/auth/permissions";
import { useAuth } from "@/hooks/useAuth";
import {
  useMarkProductSold,
  usePauseProduct,
  useReserveProduct,
  useResumeProduct,
  useSubmitProductForApproval,
} from "@/lib/api/products";
import type { Product } from "@/types/product";

const AVAILABILITY_ACTION = {
  SUBMIT: "submit",
  RESERVE: "reserve",
  PAUSE: "pause",
  RESUME: "resume",
  SOLD: "sold",
} as const;

type AvailabilityAction =
  (typeof AVAILABILITY_ACTION)[keyof typeof AVAILABILITY_ACTION];

interface AvailabilityActionConfig {
  id: AvailabilityAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  Icon: typeof Tag;
}

const ACTIONS: Record<AvailabilityAction, AvailabilityActionConfig> = {
  submit: {
    id: AVAILABILITY_ACTION.SUBMIT,
    label: "Enviar a revisión",
    confirmLabel: "Confirmar envío",
    title: "Enviar a revisión",
    description:
      "El producto será enviado a la cola de revisión. Un usuario con permisos MASTER o VERIFIER deberá aprobar el producto antes de que pueda ser publicado.",
    Icon: Send,
  },
  reserve: {
    id: AVAILABILITY_ACTION.RESERVE,
    label: "Apartar",
    confirmLabel: "Confirmar apartado",
    title: "Apartar vehículo",
    description:
      "El vehículo dejará de estar disponible para nuevas publicaciones en Facebook y se solicitará el retiro de sus publicaciones activas.",
    Icon: Tag,
  },
  pause: {
    id: AVAILABILITY_ACTION.PAUSE,
    label: "En mantenimiento",
    confirmLabel: "Confirmar mantenimiento",
    title: "Pausar por mantenimiento",
    description:
      "El vehículo dejará de estar disponible para nuevas publicaciones en Facebook y se solicitará el retiro de sus publicaciones activas.",
    Icon: CirclePause,
  },
  resume: {
    id: AVAILABILITY_ACTION.RESUME,
    label: "Volver a publicado",
    confirmLabel: "Confirmar publicación",
    title: "Volver a publicado",
    description:
      "El vehículo volverá a estar disponible para publicación. No se volverá a publicar automáticamente en Facebook.",
    Icon: RotateCcw,
  },
  sold: {
    id: AVAILABILITY_ACTION.SOLD,
    label: "Marcar vendido",
    confirmLabel: "Confirmar venta",
    title: "Marcar vehículo como vendido",
    description:
      "Esta acción es final. El vehículo dejará de estar disponible y se solicitará el retiro de sus publicaciones activas en Facebook.",
    Icon: CheckCircle2,
  },
};

const LEGAL_ACTIONS: Partial<Record<Product["status"], AvailabilityAction[]>> =
  {
    draft: [AVAILABILITY_ACTION.SUBMIT],
    rejected: [AVAILABILITY_ACTION.SUBMIT],
    published: [
      AVAILABILITY_ACTION.RESERVE,
      AVAILABILITY_ACTION.PAUSE,
      AVAILABILITY_ACTION.SOLD,
    ],
    reserved: [AVAILABILITY_ACTION.SOLD, AVAILABILITY_ACTION.RESUME],
    paused: [AVAILABILITY_ACTION.RESUME],
  };

interface AvailabilityActionsProps {
  id: string;
  title: string;
  description: string | null | undefined;
  status: Product["status"];
}

export function createSoldWhatsAppUrl(
  title: string,
  description: string | null | undefined,
): string {
  const message = `VENDIDO: ${title}${description ? `\n${description}` : ""}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function AvailabilityActions({
  id,
  title,
  description,
  status,
}: AvailabilityActionsProps) {
  const { hasPermission } = useAuth();
  const [selectedAction, setSelectedAction] =
    useState<AvailabilityAction | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [shareSale, setShareSale] = useState(true);
  const [soldWhatsAppUrl, setSoldWhatsAppUrl] = useState<string | null>(null);
  const submitProduct = useSubmitProductForApproval();
  const reserveProduct = useReserveProduct();
  const pauseProduct = usePauseProduct();
  const resumeProduct = useResumeProduct();
  const markProductSold = useMarkProductSold();

  const legalActions = LEGAL_ACTIONS[status] ?? [];
  if (
    !hasPermission(Permission.MARKETPLACE_PUBLISH) ||
    legalActions.length === 0
  ) {
    return null;
  }

  const selectedConfig = selectedAction ? ACTIONS[selectedAction] : null;
  const isPending =
    submitProduct.isPending ||
    reserveProduct.isPending ||
    pauseProduct.isPending ||
    resumeProduct.isPending ||
    markProductSold.isPending;
  const mutationError =
    submitProduct.error ??
    reserveProduct.error ??
    pauseProduct.error ??
    resumeProduct.error ??
    markProductSold.error;

  async function confirmAction(): Promise<void> {
    if (!selectedAction) return;

    try {
      if (selectedAction === AVAILABILITY_ACTION.SUBMIT) {
        await submitProduct.mutateAsync(id);
      } else if (selectedAction === AVAILABILITY_ACTION.RESERVE) {
        await reserveProduct.mutateAsync(id);
      } else if (selectedAction === AVAILABILITY_ACTION.PAUSE) {
        await pauseProduct.mutateAsync(id);
      } else if (selectedAction === AVAILABILITY_ACTION.RESUME) {
        await resumeProduct.mutateAsync(id);
      } else {
        await markProductSold.mutateAsync(id);
        if (shareSale)
          setSoldWhatsAppUrl(createSoldWhatsAppUrl(title, description));
      }
      setSelectedAction(null);
    } catch {
      // The mutation hook retains and renders the server error below.
    }
  }

  // For draft/rejected with single action, show direct CTA instead of dropdown
  const isDraftOrRejected = status === "draft" || status === "rejected";
  const singleAction = legalActions.length === 1 ? legalActions[0] : null;
  const showDirectCTA =
    isDraftOrRejected && singleAction === AVAILABILITY_ACTION.SUBMIT;

  return (
    <>
      <div className="w-full sm:w-auto">
        {showDirectCTA ? (
          // Direct "Enviar a revisión" button (primary CTA for draft/rejected)
          <Button
            type="button"
            size="touch"
            className="w-full bg-ps-cyan text-ps-base hover:bg-ps-cyan/90 sm:w-auto"
            onClick={() => {
              setSelectedAction(AVAILABILITY_ACTION.SUBMIT);
            }}
          >
            {status === "rejected" ? (
              <>
                <RotateCcw aria-hidden="true" />
                Reenviar a revisión
              </>
            ) : (
              <>
                <Send aria-hidden="true" />
                Enviar a revisión
              </>
            )}
          </Button>
        ) : (
          // Dropdown for multiple actions
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="w-full border-ps-border-default bg-ps-elevated text-ps-text-secondary hover:bg-ps-bg-elevated hover:text-ps-text-primary sm:w-auto"
            onClick={() => setIsActionsOpen(true)}
          >
            {status === "draft" || status === "rejected"
              ? "Acciones"
              : "Cambiar disponibilidad"}
            <ChevronDown aria-hidden="true" />
          </Button>
        )}
      </div>

      <Dialog open={isActionsOpen} onOpenChange={setIsActionsOpen}>
        <DialogContent className="max-w-[480px] border-ps-border-default bg-ps-surface sm:rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-ps-text-primary">
              {status === "draft" || status === "rejected"
                ? "Acciones"
                : "Cambiar disponibilidad"}
            </DialogTitle>
            <DialogDescription className="text-ps-text-secondary">
              {status === "draft" || status === "rejected"
                ? "Elegí una acción para este producto."
                : "Elegí una acción permitida para este vehículo."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {legalActions.map((action) => {
              const actionConfig = ACTIONS[action];
              const { Icon } = actionConfig;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setSelectedAction(action);
                    setIsActionsOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-ps-border-default bg-ps-elevated px-4 py-3 text-left text-sm font-medium text-ps-text-primary transition-colors hover:bg-ps-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-cyan"
                >
                  <Icon
                    className="size-4 shrink-0 text-ps-text-secondary"
                    aria-hidden="true"
                  />
                  {actionConfig.label}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedConfig !== null}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <DialogContent className="max-w-[480px] border-ps-border-default bg-ps-surface sm:rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-ps-text-primary">
              {selectedConfig?.title}
            </DialogTitle>
            <DialogDescription className="text-ps-text-secondary">
              {selectedConfig?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedAction === AVAILABILITY_ACTION.SOLD && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ps-border-default bg-ps-elevated p-3 text-sm text-ps-text-secondary">
              <input
                type="checkbox"
                checked={shareSale}
                onChange={(event) => setShareSale(event.target.checked)}
                className="mt-0.5 size-4 accent-ps-cyan"
              />
              <span>
                Abrir WhatsApp para anunciar la venta. Vas a elegir el
                destinatario y enviar el mensaje manualmente.
              </span>
            </label>
          )}
          {mutationError && (
            <p
              role="alert"
              className="m-0 rounded-lg bg-ps-error-bg p-3 text-sm text-ps-error"
            >
              {mutationError.message}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              disabled={isPending}
              onClick={() => setSelectedAction(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="touch"
              disabled={isPending}
              onClick={confirmAction}
              className="w-full bg-ps-cyan text-ps-base hover:bg-ps-cyan/90 sm:w-auto"
            >
              {isPending ? "Guardando..." : selectedConfig?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={soldWhatsAppUrl !== null}
        onOpenChange={(open) => !open && setSoldWhatsAppUrl(null)}
      >
        <DialogContent className="max-w-[480px] border-ps-border-default bg-ps-surface sm:rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="text-ps-text-primary">
              Venta registrada
            </DialogTitle>
            <DialogDescription className="text-ps-text-secondary">
              El mensaje está preparado. Elegí el destinatario y envialo desde
              WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="w-full sm:w-auto"
              onClick={() => setSoldWhatsAppUrl(null)}
            >
              Ahora no
            </Button>
            {soldWhatsAppUrl && (
              <Button
                asChild
                size="touch"
                className="w-full bg-ps-cyan text-ps-base hover:bg-ps-cyan/90 sm:w-auto"
              >
                <a href={soldWhatsAppUrl} target="_blank" rel="noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
