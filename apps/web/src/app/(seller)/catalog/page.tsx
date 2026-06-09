"use client";

/**
 * CatalogPage — ProSell Inventario screen.
 *
 * 4 view modes toggled via tab bar in the header:
 *   grilla  → card grid (default)
 *   tabla   → DataGrid (TanStack Table + virtualizer)
 *   estado  → vehicles grouped by status
 *   carga   → inline BulkUploadCSV
 *
 * Data: useInfiniteVehicles + useDeleteVehicle
 * Filters: useVehicleFilters (URL state)
 * Design: var(--ps-*) tokens throughout
 */

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutGrid,
  TableIcon,
  Layers,
  Upload,
  Plus,
  Search,
  Car,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { DataGridSkeleton } from "@/components/datagrid/DataGridSkeleton";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { FilterPills } from "@/components/filters/FilterPills";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { BulkUploadCSV } from "@/components/upload/BulkUploadCSV";
import { BulkBranchAssign } from "@/components/branches/BulkBranchAssign";
import { CatalogErrorBoundary } from "@/components/catalog/CatalogErrorBoundary";
import {
  StatusBadge,
  type VehicleStatus,
} from "@/components/datagrid/StatusBadge";
import { useVehicleFilters } from "@/lib/hooks/useVehicleFilters";
import {
  useInfiniteProducts,
  useDeleteProduct,
  transformProductToVehicle,
  useProductImageUrls,
} from "@/lib/api/products";
import { getCoverImageKey, getProductImageKeys } from "@/lib/api/productImages";
import { isVehicleProduct } from "@/types/product";
import type { Product } from "@/types/product";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "grilla" | "tabla" | "estado" | "carga";

const TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "grilla", label: "Grilla", icon: LayoutGrid },
  { id: "tabla", label: "Tabla", icon: TableIcon },
  { id: "estado", label: "Por estado", icon: Layers },
  { id: "carga", label: "Carga masiva", icon: Upload },
];

const STATUS_ORDER: VehicleStatus[] = [
  "published",
  "online",
  "pending",
  "draft",
  "expired",
  "failed",
  "sold",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>([
  "published",
  "pending",
  "failed",
  "draft",
  "expired",
  "online",
  "sold",
]);

function getApiStatus(
  s: string | undefined,
):
  | "published"
  | "pending"
  | "failed"
  | "draft"
  | "expired"
  | "online"
  | "sold"
  | undefined {
  return s && VALID_STATUSES.has(s)
    ? (s as
        | "published"
        | "pending"
        | "failed"
        | "draft"
        | "expired"
        | "online"
        | "sold")
    : undefined;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Vehicle card (grid view) ─────────────────────────────────────────────────

function VehicleCard({
  product,
  onView,
  onEdit,
  onDelete,
}: {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const vehicle = isVehicleProduct(product)
    ? transformProductToVehicle(product)
    : null;
  // Pick the cover image. Priority: explicit `cover_image_key` set by
  // the seller, then the first key of the merged list as a fallback.
  // See `getCoverImageKey` for the full contract (including the
  // stale-cover-key defensive fallback).
  const rawPhotoUrl = getCoverImageKey(product);

  // DO Spaces is private (403 on direct URLs). Resolve the first image to a
  // time-limited signed download URL via the backend endpoint. The TanStack
  // query cache is keyed by productId, so all cards sharing a product share
  // the same in-flight request and result.
  //
  // We swallow errors here: if the product belongs to a different tenant
  // (404), the user lacks permission, or the API is briefly unreachable, the
  // card must still render — we just fall back to the placeholder image.
  const { data: signedUrls } = useProductImageUrls(
    rawPhotoUrl ? product.id : undefined,
  );
  const signedPhotoUrl = rawPhotoUrl
    ? (signedUrls?.images.find((img) => img.key === rawPhotoUrl)?.url ?? null)
    : null;
  const photo_url = signedPhotoUrl || undefined;

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onView}
      style={{
        background: "var(--ps-bg-surface)",
        border: `1px solid ${hovered ? "var(--ps-border-medium)" : "var(--ps-border-default)"}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 180ms, box-shadow 180ms",
        boxShadow: hovered ? "0 4px 20px rgba(6,13,36,0.35)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "var(--ps-bg-elevated)",
          overflow: "hidden",
        }}
      >
        {photo_url ? (
          <Image
            src={photo_url}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            // Bypass the `/_next/image` proxy: `photo_url` is a MinIO
            // presigned URL host-bound to `S3_PUBLIC_ENDPOINT_URL`, which
            // the server-side proxy (running inside the Docker `web`
            // container) cannot reach. The browser fetches the signed URL
            // directly. Same reason as ProductImageGallery and
            // HeroShotSelector — the catalog card has no unit test for
            // this prop because VehicleCard is an internal function of
            // this page (not exported). Verified visually after the fix.
            unoptimized
          />
        ) : (
          <Image
            src="/placeholders/placeholder-vehicles.png"
            alt="Sin imagen"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            priority
            style={{ objectFit: "cover" }}
          />
        )}
        {/* Status badge overlay */}
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <StatusBadge status={vehicle?.status ?? "draft"} />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "14px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.title}
        </p>
        <p
          style={{ margin: 0, fontSize: 12, color: "var(--ps-text-secondary)" }}
        >
          {vehicle
            ? [vehicle.year, vehicle.make, vehicle.model]
                .filter(Boolean)
                .join(" · ")
            : ""}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ps-cyan)",
            letterSpacing: "-0.02em",
          }}
        >
          {formatPrice(product.price_cents / 100)}
        </p>
      </div>

      {/* Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          borderTop: "1px solid var(--ps-border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 2,
          padding: "8px 12px",
        }}
      >
        {(
          [
            { icon: Eye, action: onView, label: "Ver", danger: false },
            { icon: Pencil, action: onEdit, label: "Editar", danger: false },
            { icon: Trash2, action: onDelete, label: "Eliminar", danger: true },
          ] satisfies {
            icon: React.ElementType;
            action: () => void;
            label: string;
            danger: boolean;
          }[]
        ).map(({ icon: Icon, action, label, danger }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={(e) => {
              e.stopPropagation();
              action();
            }}
            style={{
              width: 30,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: 0,
              borderRadius: 6,
              color: danger ? "var(--ps-error)" : "var(--ps-text-secondary)",
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = danger
                ? "var(--ps-danger-hover-bg)"
                : "var(--ps-hover-bg-sm)";
              e.currentTarget.style.color = danger
                ? "var(--ps-error)"
                : "var(--ps-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = danger
                ? "var(--ps-error)"
                : "var(--ps-text-secondary)";
            }}
          >
            <Icon size={14} strokeWidth={2} />
          </button>
        ))}
      </div>
    </article>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onAdd,
  onBulk,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  onBulk: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        height: "100%",
        padding: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ps-bg-elevated)",
          border: "1px solid var(--ps-border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Car
          size={28}
          style={{ color: "var(--ps-text-disabled)" }}
          strokeWidth={1.5}
        />
      </div>
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          {hasFilters ? "Sin resultados" : "Tu catálogo está vacío"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {hasFilters
            ? "Ajustá los filtros o el término de búsqueda."
            : "Agregá tu primer vehículo o cargá un CSV masivo para empezar."}
        </p>
      </div>
      {!hasFilters && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onAdd}
            style={{
              height: 38,
              padding: "0 18px",
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              border: 0,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Agregar vehículo
          </button>
          <button
            type="button"
            onClick={onBulk}
            style={{
              height: 38,
              padding: "0 18px",
              background: "transparent",
              color: "var(--ps-text-secondary)",
              border: "1px solid var(--ps-input-border)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Upload size={14} strokeWidth={2} />
            Carga masiva
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ps-error-bg)",
          border: "1px solid rgba(240,68,56,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle
          size={28}
          style={{ color: "var(--ps-error)" }}
          strokeWidth={1.5}
        />
      </div>
      <div style={{ maxWidth: 320 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          Error al cargar vehículos
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ps-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          height: 38,
          padding: "0 18px",
          background: "var(--ps-cyan)",
          color: "var(--ps-bg-base)",
          border: 0,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <RefreshCw size={14} strokeWidth={2} />
        Reintentar
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const router = useRouter();
  const { filters, setFilter } = useVehicleFilters();
  const deleteProduct = useDeleteProduct();
  const [viewMode, setViewMode] = useState<ViewMode>("grilla");
  const [showBulkBranchAssign, setShowBulkBranchAssign] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  const apiFilters = {
    search: filters.search || undefined,
    status: getApiStatus(filters.status[0]),
    make: filters.brand[0] || undefined,
    year_min: filters.year[0] !== 2010 ? filters.year[0] : undefined,
    year_max: filters.year[1] !== 2026 ? filters.year[1] : undefined,
  };

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(apiFilters, 50);

  const products = data?.pages[0]?.items.filter(isVehicleProduct) ?? [];
  // Transform to vehicle-like for views that need it
  const vehicles = products.map(transformProductToVehicle);
  const hasFilters = !!(
    filters.search ||
    filters.status.length > 0 ||
    filters.brand.length > 0
  );

  const handleEdit = (id: string) => router.push(`/catalog/${id}/edit`);
  const handleView = (id: string) => router.push(`/catalog/${id}`);
  const handleDelete = (id: string) => deleteProduct.mutate(id);
  const handlePublish = (_id: string) =>
    toast.info("Publicación múltiple disponible en la Fase 4.");

  const handleBulkAssignBranch = (ids: string[]) => {
    setSelectedVehicleIds(ids);
    setShowBulkBranchAssign(true);
  };

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { threshold: 1.0 },
    );
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── Bulk upload handler ──────────────────────────────────────────────────
  const handleBulkUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("csv_file", file);
    const res = await fetch("/api/v1/vehicles/bulk-upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Error al cargar" }));
      throw new Error(err.message || "Error al cargar");
    }
    return res.json();
  };

  // ── Grouped by status (estado view) ─────────────────────────────────────
  const vehiclesByStatus = Object.fromEntries(
    STATUS_ORDER.map((s) => [
      s,
      products.filter((p) => transformProductToVehicle(p).status === s),
    ]),
  );

  return (
    <CatalogErrorBoundary>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 4rem)",
          overflow: "hidden",
        }}
      >
        {/* ── Left filter sidebar ──────────────────────────────────────────── */}
        <FilterSidebar />

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 0",
              borderBottom: "1px solid var(--ps-border-subtle)",
              background: "var(--ps-bg-base)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Title + count */}
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ps-text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  Catálogo
                </h1>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 13,
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  {isLoading
                    ? "Cargando..."
                    : `${vehicles.length} vehículo${vehicles.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Search + CTA */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--ps-text-disabled)",
                      pointerEvents: "none",
                      display: "inline-flex",
                    }}
                  >
                    <Search size={14} strokeWidth={2} />
                  </span>
                  <input
                    type="search"
                    placeholder="Buscar vehículo..."
                    value={filters.search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    className="focus:border-ps-cyan focus:shadow-[0_0_0_3px_var(--ps-input-focus-shadow)]"
                    style={{
                      height: 36,
                      width: 220,
                      paddingLeft: 32,
                      paddingRight: 12,
                      background: "var(--ps-input-bg)",
                      border: "1px solid var(--ps-input-border)",
                      borderRadius: 8,
                      color: "var(--ps-text-primary)",
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/catalog/create")}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--ps-cyan)",
                    color: "var(--ps-bg-base)",
                    border: 0,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Agregar vehículo
                </button>
              </div>
            </div>

            {/* View mode tabs */}
            <div style={{ display: "flex", gap: 2 }}>
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = viewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setViewMode(id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 36,
                      padding: "0 14px",
                      background: "transparent",
                      border: 0,
                      borderRadius: "8px 8px 0 0",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active
                        ? "var(--ps-cyan)"
                        : "var(--ps-text-secondary)",
                      cursor: "pointer",
                      borderBottom: active
                        ? "2px solid var(--ps-cyan)"
                        : "2px solid transparent",
                      transition: "color 150ms",
                    }}
                  >
                    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active filter pills */}
          <FilterPills />

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: viewMode === "tabla" ? 0 : 24,
            }}
          >
            {/* CARGA MASIVA */}
            {viewMode === "carga" && (
              <BulkUploadCSV
                onUpload={handleBulkUpload}
                onSuccess={() => {
                  toast.success("Carga completada");
                  setViewMode("grilla");
                }}
                onCancel={() => setViewMode("grilla")}
              />
            )}

            {/* DATA VIEWS: grilla / tabla / estado */}
            {viewMode !== "carga" && (
              <>
                {isLoading && <DataGridSkeleton />}

                {!isLoading && error && (
                  <ErrorState
                    message={
                      error instanceof Error
                        ? error.message
                        : "Error inesperado."
                    }
                  />
                )}

                {!isLoading && !error && vehicles.length === 0 && (
                  <EmptyState
                    hasFilters={hasFilters}
                    onAdd={() => router.push("/catalog/create")}
                    onBulk={() => setViewMode("carga")}
                  />
                )}

                {!isLoading && !error && vehicles.length > 0 && (
                  <>
                    {/* GRILLA */}
                    {viewMode === "grilla" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(240px, 1fr))",
                          gap: 16,
                        }}
                      >
                        {products.map((p) => (
                          <VehicleCard
                            key={p.id}
                            product={p}
                            onView={() => handleView(p.id)}
                            onEdit={() => handleEdit(p.id)}
                            onDelete={() => handleDelete(p.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* TABLA */}
                    {viewMode === "tabla" && (
                      <div style={{ padding: 24 }}>
                        <DataGrid
                          data={vehicles}
                          onPublish={handlePublish}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onBulkAssignBranch={handleBulkAssignBranch}
                          onRowClick={handleView}
                        />
                      </div>
                    )}

                    {/* ESTADO — grouped by status */}
                    {viewMode === "estado" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 32,
                        }}
                      >
                        {STATUS_ORDER.filter(
                          (s) => vehiclesByStatus[s].length > 0,
                        ).map((status) => (
                          <section key={status}>
                            {/* Group header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 14,
                              }}
                            >
                              <StatusBadge status={status} />
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "var(--ps-text-secondary)",
                                  fontWeight: 500,
                                }}
                              >
                                {vehiclesByStatus[status].length} vehículo
                                {vehiclesByStatus[status].length !== 1
                                  ? "s"
                                  : ""}
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  height: 1,
                                  background: "var(--ps-border-subtle)",
                                }}
                              />
                            </div>
                            {/* Grid of cards */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: 12,
                              }}
                            >
                              {vehiclesByStatus[status].map((p) => (
                                <VehicleCard
                                  key={p.id}
                                  product={p}
                                  onView={() => handleView(p.id)}
                                  onEdit={() => handleEdit(p.id)}
                                  onDelete={() => handleDelete(p.id)}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    )}

                    {/* Infinite scroll sentinel */}
                    {hasNextPage && viewMode !== "tabla" && (
                      <div
                        ref={sentinelRef}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 20,
                          gap: 8,
                        }}
                      >
                        {isFetchingNextPage && (
                          <>
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: "2px solid transparent",
                                borderTopColor: "var(--ps-cyan)",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--ps-text-secondary)",
                              }}
                            >
                              Cargando más...
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {!hasNextPage &&
                      vehicles.length > 0 &&
                      viewMode !== "tabla" && (
                        <p
                          style={{
                            textAlign: "center",
                            fontSize: 12,
                            color: "var(--ps-text-disabled)",
                            padding: "16px 0",
                          }}
                        >
                          {vehicles.length} vehículo
                          {vehicles.length !== 1 ? "s" : ""} en total
                        </p>
                      )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette vehicles={vehicles} />

        {/* Bulk Branch Assign modal */}
        <BulkBranchAssign
          open={showBulkBranchAssign}
          onOpenChange={setShowBulkBranchAssign}
          productIds={selectedVehicleIds}
          productCount={selectedVehicleIds.length}
        />
      </div>
    </CatalogErrorBoundary>
  );
}
