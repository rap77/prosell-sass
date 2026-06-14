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
import { isVehicleProduct } from "@/types/product";

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
    description: product.description,
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
    if (!status || !isVehicleProduct(product)) return [];
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
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: "var(--ps-text-secondary)",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: "#1877F2",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Facebook size={10} strokeWidth={2.5} style={{ color: "#fff" }} />
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
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "var(--ps-bg-elevated)",
        animation: "psSkel 1.4s ease-in-out infinite",
      }}
    />
  );
}

function PublicationsPageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes psSkel { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "56px 24px",
        textAlign: "center",
        background: "var(--ps-bg-surface)",
        border: "1px dashed var(--ps-border-medium)",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ps-info-bg)",
          border: "1px solid rgba(77,184,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Rocket
          size={28}
          style={{ color: "var(--ps-cyan)" }}
          strokeWidth={1.8}
        />
      </div>
      <div style={{ maxWidth: 400 }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ps-text-primary)",
          }}
        >
          Todavía no tenés publicaciones
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--ps-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          Cuando publiques un vehículo en Facebook Marketplace aparecerá aquí
          con su estado más reciente.
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          disabled={!canPublish}
          onClick={onOpenModal}
          style={{
            height: 38,
            padding: "0 18px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: canPublish ? "var(--ps-cyan)" : "rgba(77,184,255,0.35)",
            color: "var(--ps-bg-base)",
            border: 0,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: canPublish ? "pointer" : "not-allowed",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva publicación
        </button>
        <Link
          href="/catalog"
          style={{
            height: 38,
            padding: "0 18px",
            display: "inline-flex",
            alignItems: "center",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ps-text-secondary)",
            textDecoration: "none",
          }}
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
      style={{
        background: "var(--ps-bg-surface)",
        border: `1px solid ${hovered ? "var(--ps-border-medium)" : "var(--ps-border-default)"}`,
        borderRadius: 12,
        overflow: "hidden",
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
        }}
      >
        {image ? (
          <Image
            src={image}
            alt={pub.title}
            fill
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Rocket
              size={28}
              style={{ color: "var(--ps-text-tertiary)" }}
              strokeWidth={1.5}
            />
          </div>
        )}
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <PublicationStatus status={pub.status} />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
          {pub.title}
        </p>
        <FbBadge />
        <p
          style={{ margin: 0, fontSize: 11, color: "var(--ps-text-tertiary)" }}
        >
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
    if (!isVehicleProduct(p)) return [];
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            padding: 40,
            textAlign: "center",
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--ps-error-bg)",
              border: "1px solid rgba(240,68,56,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <AlertCircle
              size={26}
              style={{ color: "var(--ps-error)" }}
              strokeWidth={1.8}
            />
          </div>
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
            }}
          >
            No pudimos cargar las publicaciones
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {error.message}
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                height: 38,
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid var(--ps-input-border)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ps-text-secondary)",
                cursor: "pointer",
              }}
            >
              <RefreshCcw size={14} strokeWidth={2} />
              Reintentar
            </button>
            <Link
              href="/catalog"
              style={{
                height: 38,
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                background: "var(--ps-cyan)",
                color: "var(--ps-bg-base)",
                border: 0,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
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
              Publicaciones
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--ps-text-secondary)",
              }}
            >
              Administrá tus publicaciones de Facebook Marketplace y lanzá
              nuevas desde el catálogo.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* View mode toggle */}
            {publicationRows.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "var(--ps-bg-elevated)",
                  border: "1px solid var(--ps-border-default)",
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                {VIEW_TABS.map(({ id, label, icon: Icon }) => {
                  const active = viewMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setViewMode(id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        height: 28,
                        padding: "0 10px",
                        background: active
                          ? "var(--ps-bg-surface)"
                          : "transparent",
                        border: 0,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: active ? 600 : 400,
                        color: active
                          ? "var(--ps-cyan)"
                          : "var(--ps-text-secondary)",
                        cursor: "pointer",
                        boxShadow: active
                          ? "0 1px 4px rgba(6,13,36,0.3)"
                          : "none",
                        transition: "all 150ms",
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
              style={{
                height: 36,
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: canCreatePublication
                  ? "var(--ps-cyan)"
                  : "rgba(77,184,255,0.35)",
                color: "var(--ps-bg-base)",
                border: 0,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: canCreatePublication ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Nueva publicación
            </button>
          </div>
        </div>

        {/* Facebook pages warning */}
        {facebookPages && facebookPages.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--ps-warning-bg)",
              border: "1px solid rgba(245,166,35,0.25)",
            }}
          >
            <AlertTriangle
              size={15}
              style={{
                color: "var(--ps-warning)",
                flexShrink: 0,
                marginTop: 1,
              }}
              strokeWidth={2}
            />
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--ps-warning)",
                lineHeight: 1.5,
              }}
            >
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
          <div
            style={{
              background: "var(--ps-bg-surface)",
              border: "1px solid var(--ps-border-default)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--ps-bg-elevated)",
                    borderBottom: "1px solid var(--ps-border-subtle)",
                  }}
                >
                  {[
                    "Vehículo",
                    "Plataforma",
                    "Estado",
                    "Última actualización",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ps-text-tertiary)",
                        whiteSpace: "nowrap",
                      }}
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
                    style={{
                      borderBottom: "1px solid var(--ps-table-divider)",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--ps-table-row-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Vehicle */}
                    <td style={{ padding: "14px 20px", verticalAlign: "top" }}>
                      <p
                        style={{
                          margin: "0 0 3px",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--ps-text-primary)",
                        }}
                      >
                        {pub.title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: "var(--ps-text-tertiary)",
                          fontFamily: "monospace",
                        }}
                      >
                        {pub.productId}
                      </p>
                    </td>
                    {/* Platform */}
                    <td style={{ padding: "14px 20px" }}>
                      <FbBadge />
                    </td>
                    {/* Status */}
                    <td style={{ padding: "14px 20px" }}>
                      <PublicationStatus status={pub.status} />
                    </td>
                    {/* Updated */}
                    <td
                      style={{
                        padding: "14px 20px",
                        fontSize: 13,
                        color: "var(--ps-text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(pub.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── GRID VIEW ─────────────────────────────────────────────────── */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
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
