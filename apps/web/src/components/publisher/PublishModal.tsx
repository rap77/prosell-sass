"use client";

/**
 * PublishModal — ProSell publisher modal.
 *
 * Custom modal (replaces Radix Dialog) for publishing vehicles to
 * Facebook Marketplace. Business logic preserved exactly.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
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
  id: string; // Vehicle UUID for publish API
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
  onPublished?: (
    publication: PublicationResponse,
    vehicleData: VehicleData,
  ) => void;
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
    <div className="bg-error-bg border border-error rounded-[10px] p-4 mb-4">
      <p className="m-0 text-xs font-medium text-error">
        Facebook solicita validación de seguridad. Abrí tu cuenta en un
        navegador para resolver el desafío antes de reintentar.
      </p>
      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--ps-cyan)" }}
        />
        <span className="text-xs text-error">
          Ya validé mi cuenta de Facebook
        </span>
      </label>
      <button
        type="button"
        disabled={!checked || unlockMutation.isPending}
        onClick={() => unlockMutation.mutate()}
        className="mt-3 h-[34px] px-3.5 bg-error text-white text-xs font-semibold border-none rounded-lg cursor-pointer"
        style={{
          opacity: !checked || unlockMutation.isPending ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {unlockMutation.isPending
          ? "Desbloqueando..."
          : "Desbloquear y Reintentar"}
      </button>
      {unlockMutation.isError && (
        <p className="m-0 mt-2 text-[11px] text-error">
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
  const effectiveVehicleId =
    vehicleData?.id || selectedVehicleId || vehicleOptions[0]?.id || "";
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

  const isSubmitting = publishMutation.isPending || updateMutation.isPending;
  const submitError =
    publishMutation.error?.message ?? updateMutation.error?.message ?? null;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "publish" ? "Preparar publicación" : "Actualizar publicación"
        }
        onClick={(e) => e.stopPropagation()}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[672px] bg-surface border border-border-default rounded-xl shadow-[0_24px_48px_var(--ps-shadow-overlay)] z-50 max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
          <h2 className="m-0 text-base font-bold tracking-tight text-text-primary">
            {mode === "publish"
              ? "Preparar Publicación"
              : "Actualizar Publicación"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-0 bg-transparent text-text-secondary cursor-pointer transition-[background_color_0.15s,color_0.15s]"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--ps-bg-elevated)";
              e.currentTarget.style.color = "var(--ps-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ps-text-secondary)";
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
          {/* Vehicle selector (when no fixed vehicleData) */}
          {!vehicleData && vehicleOptions.length > 0 && (
            <div className="mb-4 rounded-[10px] border border-border-default bg-bg-elevated p-4">
              <label
                htmlFor="publication-vehicle-select"
                className="block mb-2 text-xs font-medium text-text-primary"
              >
                Vehículo a publicar
              </label>
              <select
                id="publication-vehicle-select"
                value={effectiveVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg text-text-primary text-xs px-3 py-2 outline-none"
              >
                {vehicleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category B error */}
          {currentPublication?.blocked_until_confirmed && (
            <CategoryBErrorBanner
              publicationId={currentPublication.id}
              onUnlocked={() =>
                queryClient.invalidateQueries({ queryKey: ["catalog"] })
              }
            />
          )}

          {/* Submit error */}
          {submitError && (
            <div className="mb-4 bg-error-bg border border-error rounded-[10px] p-3">
              <p className="m-0 text-xs text-error">
                {submitError}
              </p>
            </div>
          )}

          {/* No vehicle selected warning */}
          {!selectedVehicleData && (
            <div className="rounded-[10px] border border-warning bg-warning-bg p-4 text-xs text-warning mb-4">
              Seleccioná un vehículo del catálogo para preparar la publicación.
            </div>
          )}

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

        {/* Footer spacer */}
        <div className="shrink-0 h-6" />
      </div>
    </>
  );
}
