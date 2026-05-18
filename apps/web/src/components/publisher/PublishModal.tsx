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

interface VehicleOption {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  tenant_id: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  vehicle_condition?: string;
  fuel_type?: string;
  transmission?: string;
  clean_title?: boolean;
  vin?: string;
  vehicle_type?: string;
}

interface PublishModalProps {
  vehicleId: string | null;
  mode: "publish" | "update" | null;
  vehicleData?: VehicleData;
  vehicleOptions?: VehicleOption[];
  currentPublication?: PublicationResponse | null;
  facebookPages?: FacebookPage[];
  onClose: () => void;
  onPublished?: (publication: PublicationResponse, vehicleData: VehicleData) => void;
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
        <span className="text-sm text-red-800">
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
        <p className="mt-2 text-xs text-red-800">
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
  vehicleOptions = [],
  currentPublication,
  facebookPages = [],
  onClose,
  onPublished,
}: PublishModalProps) {
  const queryClient = useQueryClient();
  const isOpen = mode !== null && vehicleId !== null;
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const effectiveVehicleId = vehicleData?.id || selectedVehicleId || vehicleOptions[0]?.id || "";
  const selectedVehicleData =
    vehicleData ??
    vehicleOptions.find((option) => option.id === effectiveVehicleId);

  const publishMutation = useMutation({
    mutationFn: (data: PublishVehicleRequest) => {
      const productId = selectedVehicleData?.id ?? vehicleId;

      if (!productId) {
        throw new Error("Seleccioná un vehículo antes de publicar.");
      }

      return publishVehicle(productId, data);
    },
    onSuccess: (publication) => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (selectedVehicleData) {
        onPublished?.(publication, selectedVehicleData);
      }
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
            {!vehicleData && vehicleOptions.length > 0 ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label
                  htmlFor="publication-vehicle-select"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Vehículo a publicar
                </label>
                <select
                  id="publication-vehicle-select"
                  value={effectiveVehicleId}
                  onChange={(event) => setSelectedVehicleId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {vehicleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

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
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            {!selectedVehicleData ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Seleccioná un vehículo del catálogo para preparar la publicación.
              </div>
            ) : null}

            <PublishForm
              mode={mode!}
              key={selectedVehicleData?.id ?? "publish-form"}
              vehicleData={selectedVehicleData}
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
