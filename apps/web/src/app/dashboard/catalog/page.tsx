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
  make: string; // Display name for table (e.g., "Toyota")
  model: string;
  price_cents: number;
  zip_code: string;
  description?: string;
  image_urls: string[];
  tenant_id: string;
  publication?: PublicationResponse | null;
  // Vehicle fields for form pre-filling (FB keys)
  make_key?: string; // FB key for form (e.g., "toyota")
  vehicle_type?: string;
  mileage?: number;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  vehicle_condition?: string;
  fuel_type?: string;
  transmission?: string;
  clean_title?: boolean;
  vin?: string;
}

// Mock Facebook pages for the dropdown
const MOCK_FACEBOOK_PAGES = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-000000000001", name: "ProSell Autos - Main" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-000000000002", name: "ProSell Autos - NY" },
];

const MOCK_VEHICLES: CatalogVehicle[] = [
  {
    id: "01234567-89ab-cdef-0123-456789abcdef",  // UUID for Toyota Corolla
    year: 2020,
    make: "Toyota", // Display name for table
    model: "Corolla",
    price_cents: 1800000,
    zip_code: "10001",
    description: "Excelente estado, único dueño, service al día.",
    image_urls: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
      "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400",
    ],
    tenant_id: "e1871fb7-cf0e-4374-a4ff-89809adffc4e",  // Current user's tenant_id
    publication: null,
    // Required vehicle fields for the form (using FB keys)
    make_key: "toyota", // FB key for form dropdown
    vehicle_type: "car_truck",
    mileage: 45000,
    body_style: "sedan",
    exterior_color: "white",
    interior_color: "black",
    vehicle_condition: "excellent",
    fuel_type: "gasoline",
    transmission: "automatic",
    clean_title: true,
    vin: "1HGBH41JXMN109186",
  },
  {
    id: "12345678-9abc-def0-1234-56789abcdef0",  // UUID for Honda Civic
    year: 2019,
    make: "Honda", // Display name for table
    model: "Civic",
    price_cents: 1650000,
    zip_code: "10001",
    description: "Automático, full equipo, nafta.",
    image_urls: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    ],
    tenant_id: "e1871fb7-cf0e-4374-a4ff-89809adffc4e",  // Current user's tenant_id
    publication: {
      id: "23456789-abcd-ef01-2345-6789abcdef01",  // UUID for publication
      product_id: "12345678-9abc-def0-1234-56789abcdef0",
      status: "published",
      fb_listing_id: "fb-123456",
      blocked_until_confirmed: false,
    },
    make_key: "honda", // FB key for form dropdown
    vehicle_type: "car_truck",
    mileage: 52000,
    body_style: "sedan",
    exterior_color: "gray",
    interior_color: "gray",
    vehicle_condition: "very_good",
    fuel_type: "gasoline",
    transmission: "automatic",
    clean_title: true,
  },
  {
    id: "34567890-bcde-f012-3456-789abcdef012",  // UUID for Ford Focus
    year: 2021,
    make: "Ford", // Display name for table
    model: "Focus",
    price_cents: 1950000,
    zip_code: "10002",
    image_urls: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400",
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400",
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400",
    ],
    tenant_id: "e1871fb7-cf0e-4374-a4ff-89809adffc4e",  // Current user's tenant_id
    publication: {
      id: "45678901-cdef-0123-4567-89abcdef0123",  // UUID for publication
      product_id: "34567890-bcde-f012-3456-789abcdef012",
      status: "failed",
      error_message: "Security challenge required",
      error_category: "blocking",
      blocked_until_confirmed: true,
    },
    make_key: "ford", // FB key for form dropdown
    vehicle_type: "car_truck",
    mileage: 38000,
    body_style: "hatchback",
    exterior_color: "blue",
    interior_color: "black",
    vehicle_condition: "good",
    fuel_type: "gasoline",
    transmission: "manual",
    clean_title: true,
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
        id: selectedVehicleRaw.id,  // Include vehicle UUID for publish API
        title: `${selectedVehicleRaw.year} ${selectedVehicleRaw.make} ${selectedVehicleRaw.model}`,
        description: selectedVehicleRaw.description,
        price_cents: selectedVehicleRaw.price_cents,
        zip_code: selectedVehicleRaw.zip_code,
        image_urls: selectedVehicleRaw.image_urls,
        tenant_id: selectedVehicleRaw.tenant_id,
        // Vehicle fields for pre-filling the form
        year: selectedVehicleRaw.year,
        make: selectedVehicleRaw.make_key || selectedVehicleRaw.make, // Use FB key if available
        model: selectedVehicleRaw.model,
        vehicle_type: selectedVehicleRaw.vehicle_type,
        mileage: selectedVehicleRaw.mileage,
        body_style: selectedVehicleRaw.body_style,
        exterior_color: selectedVehicleRaw.exterior_color,
        interior_color: selectedVehicleRaw.interior_color,
        vehicle_condition: selectedVehicleRaw.vehicle_condition,
        fuel_type: selectedVehicleRaw.fuel_type,
        transmission: selectedVehicleRaw.transmission,
        clean_title: selectedVehicleRaw.clean_title,
        vin: selectedVehicleRaw.vin,
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
        facebookPages={MOCK_FACEBOOK_PAGES}
        onClose={closeModal}
      />
    </div>
  );
}
