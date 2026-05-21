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
    <div style={{
      background: 'var(--ps-error-bg)',
      border: '1px solid var(--ps-error)',
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--ps-error)' }}>
        Facebook solicita validación de seguridad. Abrí tu cuenta en un
        navegador para resolver el desafío antes de reintentar.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--ps-cyan)' }}
        />
        <span style={{ fontSize: 13, color: 'var(--ps-error)' }}>
          Ya validé mi cuenta de Facebook
        </span>
      </label>
      <button
        type="button"
        disabled={!checked || unlockMutation.isPending}
        onClick={() => unlockMutation.mutate()}
        style={{
          marginTop: 12,
          height: 34,
          padding: '0 14px',
          background: 'var(--ps-error)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          opacity: !checked || unlockMutation.isPending ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {unlockMutation.isPending ? "Desbloqueando..." : "Desbloquear y Reintentar"}
      </button>
      {unlockMutation.isError && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ps-error)' }}>
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

  const isSubmitting = publishMutation.isPending || updateMutation.isPending;
  const submitError = publishMutation.error?.message ?? updateMutation.error?.message ?? null;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "publish" ? "Preparar publicación" : "Actualizar publicación"}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 672,
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          boxShadow: '0 24px 48px rgba(6,13,36,0.4)',
          zIndex: 50,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--ps-border-default)',
          flexShrink: 0,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--ps-text-primary)',
          }}>
            {mode === "publish" ? "Preparar Publicación" : "Actualizar Publicación"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--ps-text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ps-bg-elevated)'
              e.currentTarget.style.color = 'var(--ps-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--ps-text-secondary)'
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1, minHeight: 0 }}>

          {/* Vehicle selector (when no fixed vehicleData) */}
          {!vehicleData && vehicleOptions.length > 0 && (
            <div style={{
              marginBottom: 16,
              borderRadius: 10,
              border: '1px solid var(--ps-border-default)',
              background: 'var(--ps-bg-elevated)',
              padding: 16,
            }}>
              <label
                htmlFor="publication-vehicle-select"
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ps-text-primary)',
                }}
              >
                Vehículo a publicar
              </label>
              <select
                id="publication-vehicle-select"
                value={effectiveVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid var(--ps-input-border)',
                  background: 'var(--ps-input-bg)',
                  color: 'var(--ps-text-primary)',
                  fontSize: 13,
                  padding: '8px 12px',
                  outline: 'none',
                }}
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
            <div style={{
              marginBottom: 16,
              background: 'var(--ps-error-bg)',
              border: '1px solid var(--ps-error)',
              borderRadius: 10,
              padding: 12,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-error)' }}>{submitError}</p>
            </div>
          )}

          {/* No vehicle selected warning */}
          {!selectedVehicleData && (
            <div style={{
              borderRadius: 10,
              border: '1px solid var(--ps-warning)',
              background: 'var(--ps-warning-bg)',
              padding: 16,
              fontSize: 13,
              color: 'var(--ps-warning)',
              marginBottom: 16,
            }}>
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
        <div style={{ flexShrink: 0, height: 24 }} />
      </div>
    </>
  );
}
