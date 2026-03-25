"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  publishVehicle,
  updateListing,
  deleteListing,
  unlockCategoryB,
} from "@/lib/api/publisherApi";
import type {
  PublicationResponse,
  PublishVehicleRequest,
} from "@/lib/api/publisherApi";
import { PublishForm } from "./PublishForm";

// ============================================
// TYPES
// ============================================

interface VehicleData {
  id: string;  // Vehicle UUID for publish API
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  tenant_id: string;
}

interface FacebookPage {
  id: string;
  name: string;
}

interface PublishModalProps {
  vehicleId: string | null;
  mode: "publish" | "update" | null;
  vehicleData?: VehicleData;
  currentPublication?: PublicationResponse | null;
  facebookPages?: FacebookPage[];
  onClose: () => void;
}

// ============================================
// CATEGORY B ERROR BANNER
// ============================================

function CategoryBErrorBanner({
  publicationId,
  onUnlocked,
}: {
  publicationId: string;
  onUnlocked: () => void;
}) {
  const [checked, setChecked] = useState(false);

  const unlockMutation = useMutation({
    mutationFn: () => unlockCategoryB(publicationId),
    onSuccess: onUnlocked,
  });

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <p className="text-red-800 text-sm font-medium">
        Facebook solicita validación de seguridad. Abrí tu cuenta en un
        navegador para resolver el desafío antes de reintentar.
      </p>
      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="rounded border-slate-300"
        />
        <span className="text-sm text-red-700">
          Ya validé mi cuenta de Facebook
        </span>
      </label>
      <button
        type="button"
        disabled={!checked || unlockMutation.isPending}
        onClick={() => unlockMutation.mutate()}
        className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-red-700 transition-colors"
      >
        {unlockMutation.isPending ? "Desbloqueando..." : "Desbloquear y Reintentar"}
      </button>
      {unlockMutation.isError && (
        <p className="mt-2 text-xs text-red-700">
          Error al desbloquear. Intentá de nuevo.
        </p>
      )}
    </div>
  );
}

// ============================================
// PUBLISH MODAL
// ============================================

export function PublishModal({
  vehicleId,
  mode,
  vehicleData,
  currentPublication,
  facebookPages = [],
  onClose,
}: PublishModalProps) {
  const queryClient = useQueryClient();
  const isOpen = mode !== null && vehicleId !== null;

  const publishMutation = useMutation({
    mutationFn: (data: PublishVehicleRequest) =>
      publishVehicle(vehicleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PublishVehicleRequest) =>
      updateListing(currentPublication!.id, {
        title: data.title,
        description: data.description,
        price_cents: data.price_cents,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(currentPublication!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
  });

  const handleSubmit = (data: PublishVehicleRequest) => {
    if (mode === "publish") {
      publishMutation.mutate(data);
    } else if (mode === "update") {
      updateMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const isSubmitting =
    publishMutation.isPending || updateMutation.isPending;

  const submitError =
    publishMutation.error?.message ?? updateMutation.error?.message ?? null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-xl z-50 max-h-[85vh] flex flex-col overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {mode === "publish"
                ? "Preparar Publicación"
                : "Actualizar Publicación"}
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="sr-only">Cerrar</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Dialog.Close>
          </div>

          {/* Content - overflow-y-auto */}
          <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
            {currentPublication?.blocked_until_confirmed && (
              <CategoryBErrorBanner
                publicationId={currentPublication.id}
                onUnlocked={() =>
                  queryClient.invalidateQueries({ queryKey: ["catalog"] })
                }
              />
            )}

            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <PublishForm
              mode={mode!}
              vehicleData={vehicleData}
              currentPublication={currentPublication}
              facebookPages={facebookPages}
              onSubmit={handleSubmit}
              onDelete={mode === "update" ? handleDelete : undefined}
              isSubmitting={isSubmitting}
              isDeleting={deleteMutation.isPending}
            />
          </div>

          {/* Footer - spacer to maintain rounded bottom corners */}
          <div className="flex-shrink-0 h-6" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
