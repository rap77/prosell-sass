"use client";

/**
 * PublicationsPage — ProSell Publications screen.
 *
 * Two view modes: Lista (table, default) + Grilla (cards).
 * All business logic preserved (optimistic rows, FB pages warning, modal).
 * All colors via var(--ps-*) tokens.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Plus,
  Rocket,
  RefreshCcw,
  LayoutGrid,
  TableIcon,
  AlertTriangle,
  AlertCircle,
  Facebook,
} from "lucide-react";
import { PublishModal } from "@/components/publisher/PublishModal";
import { PublicationStatus } from "@/components/publisher/PublicationStatus";
import {
  useFacebookPages,
  type PublicationResponse,
} from "@/lib/api/publisherApi";
import { useProducts } from "@/lib/api/products";
import { getProductImageKeys } from "@/lib/api/productImages";
import type { Product, ProductWithVehicle } from "@/types/product";

// Local category check for the publications view (the only remaining
// frontend consumer of the vehicle-specific path). Reads
// `p.attributes.category` directly — no dependency on the deprecated
// `isVehicleProduct` type guard from `@/types/product`. Unblocks a
// future cleanup that deletes the now-fully-deprecated helper.
//
// Type-guard signature preserved (`p is ProductWithVehicle`) so the
// downstream `product.attributes` still narrows to `VehicleAttributes`
// — same as the old `isVehicleProduct`.
function isVehicleCategory(p: Product): p is ProductWithVehicle {
  return p.attributes.category === "vehicle";
}

// ─── Domain types (unchanged) ─────────────────────────────────────────────────

type PublicationListStatus =
  | "pending"
  | "publishing"
  | "published"
  | "failed"
  | "expired"
  | "sold";

interface PublicationRow {
  id: string;
  productId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  platform: "Facebook Marketplace";
  status: PublicationListStatus;
}

interface PublishableVehicleData {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  // tenant_id is derived from current_user server-side. Optional, kept for legacy callers.
  tenant_id?: string;
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

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = "lista" | "grilla";

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "lista", label: "Lista", icon: TableIcon },
  { id: "grilla", label: "Grilla", icon: LayoutGrid },
];

// ─── Pure helpers (unchanged logic) ──────────────────────────────────────────

function isPublicationListStatus(v: string): v is PublicationListStatus {
  return [
    "pending",
    "publishing",
    "published",
    "failed",
    "expired",
    "sold",
  ].includes(v);
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getProductImageUrls(product: Product): string[] {
  // Structured `attrs.images[]` (rich ProductImage objects) takes
  // priority — preserved from the original logic. The flat-key
  // fallback is delegated to the shared resolver so the
  // `Array.isArray(x) ? x : …` short-circuit bug doesn't reappear
  // here either. See `lib/api/productImages.ts` for the merge
  // contract and the regression context.
  const attrs = product.attributes;
  const raw =
    isRecord(attrs) && Array.isArray(attrs.images) ? attrs.images : [];
  const structured = raw.flatMap((img) =>
    isRecord(img) && typeof img.url === "string" && img.url.length > 0
      ? [img.url]
      : [],
  );
  if (structured.length > 0) return structured;
  return getProductImageKeys(product);
}
function mapProductStatusToPublicationStatus(
  product: Product,
): PublicationListStatus | null {
  switch (product.status) {
    case "pending":
      return "pending";
    case "published":
      return "published";
    case "sold":
      return "sold";
    case "rejected":
      return "failed";
    case "archived":
      return "expired";
    default:
      return null;
  }
}
function toPublishableVehicleData(
  product: ProductWithVehicle,
): PublishableVehicleData {
  const a = product.attributes;
  return {
    id: product.id,
    title: product.title,
    description: product.description ?? undefined,
    price_cents: product.price_cents,
    zip_code: product.location_zip ?? "",
    image_urls: getProductImageUrls(product),
    tenant_id: product.tenant_id,
    year: a.year,
    make: a.make,
    model: a.model,
    mileage: a.mileage,
    body_style: a.body_type,
    exterior_color: a.exterior_color,
    interior_color: a.interior_color,
    vehicle_condition: product.condition,
    fuel_type: a.fuel_type,
    transmission: a.transmission,
    clean_title: true,
    vin: a.vin,
    vehicle_type: "car_truck",
  };
}
function buildPublicationRows(products: Product[]): PublicationRow[] {
  return products.flatMap((product) => {
    const status = mapProductStatusToPublicationStatus(product);
    if (!status || !isVehicleCategory(product)) return [];
    return [
      {
        id: product.id,
        productId: product.id,
        title: product.title,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        platform: "Facebook Marketplace",
        status,
      },
    ];
  });
}
function formatDate(v: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}

// ─── Facebook platform badge ──────────────────────────────────────────────────

function FbBadge() {
  return (
    <span className="inline-flex items-center gap-1.25 text-xs text-ps-text-secondary">
      <span className="flex h-4 w-4 items-center justify-center rounded bg-[#1877F2]">
        <Facebook size={10} strokeWidth={2.5} className="text-white" />
      </span>
      Facebook Marketplace
    </span>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PulseBox({
  w,
  h,
  radius = 8,
}: {
  w: string | number;
  h: number;
  radius?: number;
}) {
  return (
    <div
      className="bg-ps-elevated"
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        animation: "psSkel 1.4s ease-in-out infinite",
      }}
    />
  );
}

function PublicationsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <style>{`@keyframes psSkel { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <PulseBox w={180} h={28} />
          <PulseBox w={300} h={16} />
        </div>
        <PulseBox w={160} h={36} />
      </div>
      <PulseBox w="100%" h={380} radius={12} />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  canPublish,
  onOpenModal,
}: {
  canPublish: boolean;
  onOpenModal: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ps-border-medium bg-ps-surface px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(77,184,255,0.25)] bg-ps-info-bg">
        <Rocket
          size={28}
          className="text-ps-cyan"
          strokeWidth={1.8}
        />
      </div>
      <div className="max-w-sm">
        <h2 className="mb-2 text-xl font-bold leading-tight tracking-tighter text-ps-text-primary">
          Todavía no tenés publicaciones
        </h2>
        <p className="m-0 text-sm leading-relaxed text-ps-text-secondary">
          Cuando publiques un vehículo en Facebook Marketplace aparecerá aquí
          con su estado más reciente.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          disabled={!canPublish}
          onClick={onOpenModal}
          className={cn(
            "inline-flex h-9.5 items-center gap-1.5 rounded-lg border-0 px-4.5 text-xs font-semibold",
            canPublish
              ? "cursor-pointer bg-ps-cyan text-ps-base"
              : "cursor-not-allowed bg-[rgba(77,184,255,0.35)] text-ps-base"
          )}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva publicación
        </button>
        <Link
          href="/catalog"
          className="inline-flex h-9.5 items-center rounded-lg border border-ps-input-border bg-transparent px-4.5 text-xs font-medium text-ps-text-secondary no-underline"
        >
          Ir al catálogo
        </Link>
      </div>
    </div>
  );
}

// ─── Card (grilla view) ───────────────────────────────────────────────────────

function PublicationCard({
  pub,
  image,
}: {
  pub: PublicationRow;
  image?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col overflow-hidden rounded-xl border border-ps-border-default bg-ps-surface transition-all duration-180"
      style={{
        borderColor: hovered ? "var(--ps-border-medium)" : "var(--ps-border-default)",
        boxShadow: hovered ? "0 4px 20px rgba(6,13,36,0.35)" : "none",
      }}
    >
      {/* Image */}
      <div className="relative bg-ps-bg-elevated" style={{ aspectRatio: "16/9" }}>
        {image ? (
          <Image
            src={image}
            alt={pub.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Rocket
              size={28}
              className="text-ps-text-tertiary"
              strokeWidth={1.5}
            />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <PublicationStatus status={pub.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p
          className="m-0 overflow-hidden text-sm font-semibold leading-tight text-ps-text-primary"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {pub.title}
        </p>
        <FbBadge />
        <p className="m-0 text-xs text-ps-text-tertiary">
          {formatDate(pub.updatedAt)}
        </p>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicationsPage() {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [optimisticPublications, setOptimisticPublications] = useState<
    PublicationRow[]
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  const { data: products, isLoading, error, refetch } = useProducts();
  const { data: facebookPages, isLoading: isLoadingFacebookPages } =
    useFacebookPages();

  const productList = products ?? [];
  const publishableVehicles = productList.flatMap((p) => {
    if (!isVehicleCategory(p)) return [];
    if (p.status === "archived" || p.status === "sold") return [];
    return [toPublishableVehicleData(p)];
  });

  const publicationRows = [
    ...optimisticPublications,
    ...buildPublicationRows(productList),
  ].toSorted(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const canCreatePublication =
    publishableVehicles.length > 0 && !isLoadingFacebookPages;

  const handlePublished = (
    publication: PublicationResponse,
    vehicleData: PublishableVehicleData,
  ) => {
    setOptimisticPublications((cur) => {
      const rest = cur.filter((x) => x.id !== publication.id);
      return [
        {
          id: publication.id,
          productId: publication.product_id,
          title: vehicleData.title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          platform: "Facebook Marketplace",
          status: isPublicationListStatus(publication.status)
            ? publication.status
            : "pending",
        },
        ...rest,
      ];
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <PublicationsPageSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-60vh items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-ps-border-default bg-ps-surface p-10 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(240,68,56,0.25)] bg-ps-error-bg">
            <AlertCircle
              size={26}
              className="text-ps-error"
              strokeWidth={1.8}
            />
          </div>
          <h1 className="mb-2.5 text-xl font-bold leading-tight tracking-tighter text-ps-text-primary">
            No pudimos cargar las publicaciones
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-ps-text-secondary">
            {error.message}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex h-9.5 items-center gap-1.5 rounded-lg border border-ps-input-border bg-transparent px-4 text-xs font-medium text-ps-text-secondary"
            >
              <RefreshCcw size={14} strokeWidth={2} />
              Reintentar
            </button>
            <Link
              href="/catalog"
              className="inline-flex h-9.5 items-center rounded-lg border-0 bg-ps-cyan px-4 text-xs font-semibold text-ps-base no-underline"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold leading-tight tracking-tighter text-ps-text-primary">
              Publicaciones
            </h1>
            <p className="mt-1 text-sm text-ps-text-secondary">
              Administrá tus publicaciones de Facebook Marketplace y lanzá
              nuevas desde el catálogo.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View mode toggle */}
            {publicationRows.length > 0 && (
              <div className="flex gap-0.5 rounded-lg border border-ps-border-default bg-ps-bg-elevated p-0.75">
                {VIEW_TABS.map(({ id, label, icon: Icon }) => {
                  const active = viewMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setViewMode(id)}
                      className={cn(
                        "inline-flex h-7 items-center gap-1.25 rounded px-2.5 text-xs transition-all duration-150",
                        active
                          ? "bg-ps-surface font-semibold text-ps-cyan shadow-sm"
                          : "font-normal text-ps-text-secondary"
                      )}
                      style={{
                        boxShadow: active ? "0 1px 4px rgba(6,13,36,0.3)" : "none",
                      }}
                    >
                      <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled={!canCreatePublication}
              onClick={() => setIsPublishModalOpen(true)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-3.5 text-xs font-semibold",
                canCreatePublication
                  ? "cursor-pointer bg-ps-cyan text-ps-base"
                  : "cursor-not-allowed bg-[rgba(77,184,255,0.35)] text-ps-base"
              )}
            >
              <Plus size={14} strokeWidth={2.5} />
              Nueva publicación
            </button>
          </div>
        </div>

        {/* Facebook pages warning */}
        {facebookPages && facebookPages.length === 0 && (
          <div className="flex gap-2.5 rounded-xl border border-[rgba(245,166,35,0.25)] bg-ps-warning-bg p-3">
            <AlertTriangle
              size={15}
              className="mt-0.25 flex-shrink-0 text-ps-warning"
              strokeWidth={2}
            />
            <p className="m-0 text-sm leading-relaxed text-ps-warning">
              No hay páginas de Facebook conectadas. Podés abrir el modal, pero
              necesitás conectar una página antes de publicar.
            </p>
          </div>
        )}

        {/* Content */}
        {publicationRows.length === 0 ? (
          <EmptyState
            canPublish={canCreatePublication}
            onOpenModal={() => setIsPublishModalOpen(true)}
          />
        ) : viewMode === "lista" ? (
          /* ── TABLE VIEW ────────────────────────────────────────────────── */
          <div className="overflow-hidden rounded-2xl border border-ps-border-default bg-ps-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ps-border-subtle bg-ps-bg-elevated">
                  {[
                    "Vehículo",
                    "Plataforma",
                    "Estado",
                    "Última actualización",
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-5 text-left text-xs font-semibold uppercase tracking-wide text-ps-text-tertiary"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {publicationRows.map((pub) => (
                  <tr
                    key={pub.id}
                    className="border-b border-ps-table-divider transition-colors duration-150"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--ps-table-row-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Vehicle */}
                    <td className="p-5 align-top">
                      <p className="mb-0.75 text-sm font-semibold text-ps-text-primary">
                        {pub.title}
                      </p>
                      <p className="m-0 font-mono text-xs text-ps-text-tertiary">
                        {pub.productId}
                      </p>
                    </td>
                    {/* Platform */}
                    <td className="p-5">
                      <FbBadge />
                    </td>
                    {/* Status */}
                    <td className="p-5">
                      <PublicationStatus status={pub.status} />
                    </td>
                    {/* Updated */}
                    <td className="p-5 text-xs text-ps-text-secondary" style={{ whiteSpace: "nowrap" }}>
                      {formatDate(pub.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── GRID VIEW ─────────────────────────────────────────────────── */
          <div className="grid gap-4 auto-fill" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {publicationRows.map((pub) => (
              <PublicationCard key={pub.id} pub={pub} />
            ))}
          </div>
        )}
      </div>

      {/* Publish modal */}
      <PublishModal
        vehicleId={isPublishModalOpen ? "catalog-selector" : null}
        mode={isPublishModalOpen ? "publish" : null}
        facebookPages={facebookPages}
        vehicleOptions={publishableVehicles}
        onClose={() => setIsPublishModalOpen(false)}
        onPublished={handlePublished}
      />
    </>
  );
}
