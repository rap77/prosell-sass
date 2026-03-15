/**
 * Catalog Page — Dealer vehicle inventory with publish/update actions.
 *
 * Architecture decision (CONTEXT.md):
 * - PublishModal is rendered ONCE at page level (not inside rows).
 *   This prevents row re-renders from closing the modal unexpectedly.
 * - usePublisherStore tracks selectedVehicleId + modalMode.
 * - Row buttons call openModal(vehicleId, mode) → modal opens as overlay.
 *
 * Each row shows:
 * - Vehicle details (year, make, model, price)
 * - PublicationStatus badge (pending/publishing/published/failed/expired/sold)
 * - "Preparar Publicación" (no publication) or "Actualizar" (has publication) button
 */

"use client";

import Image from "next/image";
import { usePublisherStore } from "@/stores/publisherStore";
import { PublishModal } from "@/components/publisher/PublishModal";
import { PublicationStatus } from "@/components/publisher/PublicationStatus";
import type { PublicationResponse } from "@/lib/api/publisherApi";

// ============================================
// MOCK DATA (until catalog API is implemented)
// ============================================

interface CatalogVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  price_cents: number;
  zip_code: string;
  description?: string;
  image_urls: string[];
  tenant_id: string;
  publication?: PublicationResponse | null;
}

const MOCK_VEHICLES: CatalogVehicle[] = [
  {
    id: "veh-001",
    year: 2020,
    make: "Toyota",
    model: "Corolla",
    price_cents: 1800000,
    zip_code: "10001",
    description: "Excelente estado, único dueño, service al día.",
    image_urls: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400",
    ],
    tenant_id: "tenant-001",
    publication: null,
  },
  {
    id: "veh-002",
    year: 2019,
    make: "Honda",
    model: "Civic",
    price_cents: 1650000,
    zip_code: "10001",
    description: "Automático, full equipo, nafta.",
    image_urls: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    ],
    tenant_id: "tenant-001",
    publication: {
      id: "pub-002",
      product_id: "veh-002",
      status: "published",
      fb_listing_id: "fb-123456",
      blocked_until_confirmed: false,
    },
  },
  {
    id: "veh-003",
    year: 2021,
    make: "Ford",
    model: "Focus",
    price_cents: 1950000,
    zip_code: "10002",
    image_urls: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400",
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400",
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400",
    ],
    tenant_id: "tenant-001",
    publication: {
      id: "pub-003",
      product_id: "veh-003",
      status: "failed",
      error_message: "Security challenge required",
      error_category: "blocking",
      blocked_until_confirmed: true,
    },
  },
];

// ============================================
// HELPER
// ============================================

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ============================================
// CATALOG PAGE
// ============================================

/**
 * CatalogPage — "use client" because:
 * 1. usePublisherStore (Zustand) requires browser environment
 * 2. Row buttons trigger openModal() — client interaction
 *
 * Once TanStack Query is wired to the catalog API, the vehicle list
 * should be fetched via useQuery({ queryKey: ["catalog"] }).
 */
export default function CatalogPage() {
  const { selectedVehicleId, modalMode, openModal, closeModal } =
    usePublisherStore();

  // Derive selected vehicle data for the modal
  const selectedVehicleRaw = MOCK_VEHICLES.find(
    (v) => v.id === selectedVehicleId,
  );

  // PublishModal expects a VehicleData shape with a "title" field.
  // Catalog vehicles store year/make/model separately — we derive title here.
  const selectedVehicle = selectedVehicleRaw
    ? {
        title: `${selectedVehicleRaw.year} ${selectedVehicleRaw.make} ${selectedVehicleRaw.model}`,
        description: selectedVehicleRaw.description,
        price_cents: selectedVehicleRaw.price_cents,
        zip_code: selectedVehicleRaw.zip_code,
        image_urls: selectedVehicleRaw.image_urls,
        tenant_id: selectedVehicleRaw.tenant_id,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Catálogo de Vehículos
          </h1>
          <p className="text-sm text-slate-500">
            {MOCK_VEHICLES.length} vehículo
            {MOCK_VEHICLES.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Vehicle list */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Vehículo
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Precio
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Estado publicación
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_VEHICLES.map((vehicle) => {
                const hasPublication =
                  vehicle.publication !== null &&
                  vehicle.publication !== undefined;

                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                    {/* Vehicle info */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {vehicle.image_urls[0] && (
                          <Image
                            src={vehicle.image_urls[0]}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            width={56}
                            height={40}
                            className="rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-slate-400">
                            {vehicle.image_urls.length} foto
                            {vehicle.image_urls.length !== 1 ? "s" : ""} &middot; ZIP {vehicle.zip_code}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 text-slate-700 font-medium">
                      {formatPrice(vehicle.price_cents)}
                    </td>

                    {/* Publication status badge */}
                    <td className="px-4 py-4">
                      {hasPublication ? (
                        <PublicationStatus
                          status={vehicle.publication?.status}
                          errorCategory={vehicle.publication?.error_category}
                          blockedUntilConfirmed={
                            vehicle.publication?.blocked_until_confirmed
                          }
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Sin publicar</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          openModal(
                            vehicle.id,
                            hasPublication ? "update" : "publish",
                          )
                        }
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {hasPublication ? "Actualizar" : "Preparar Publicación"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        PublishModal rendered ONCE at page level (not inside rows).
        This is the critical UX pattern from CONTEXT.md:
        modal at row level → row re-renders → modal closes unexpectedly.
        At page level → modal lifecycle is independent of row renders.
      */}
      <PublishModal
        vehicleId={selectedVehicleId}
        mode={modalMode}
        vehicleData={selectedVehicle}
        currentPublication={selectedVehicleRaw?.publication}
        onClose={closeModal}
      />
    </div>
  );
}
