"use client";

/**
 * CatalogDetailView — ProSell vehicle detail page.
 *
 * Sections:
 *   - Image gallery (ProductImageGallery)
 *   - Title + price + status badge + description
 *   - Vehicle attribute grid
 *   - Publish / Edit action buttons
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, PencilLine, Send, AlertCircle } from "lucide-react";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import type { Vehicle } from "@/components/datagrid/DataGrid";
import { PublishModal } from "@/components/publisher/PublishModal";
import { useProduct, useProductImageUrls } from "@/lib/api/products";
import type { Product } from "@/types/product";
import type { ProductImage } from "@/types/product-image";
import { isVehicleAttributes, type VehicleAttributes } from "@/types/vehicle";
import { getCoverImageKey, getProductImageKeys } from "@/lib/api/productImages";
import { ProductImageGallery } from "./ProductImageGallery";

// ─── Helpers (preserved verbatim) ─────────────────────────────────────────────

const SUPPORTED_STATUS = {
  pending: true,
  published: true,
  sold: true,
  draft: true,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGridStatus(
  status: Product["status"],
): status is Extract<Product["status"], Vehicle["status"]> {
  return status in SUPPORTED_STATUS;
}

function formatCurrency(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(
    priceCents / 100,
  );
}

function formatMileage(attrs: VehicleAttributes): string | null {
  if (typeof attrs.mileage !== "number") return null;
  const unit = attrs.mileage_unit === "km" ? "km" : "miles";
  return `${attrs.mileage.toLocaleString("es-AR")} ${unit}`;
}

export function getProductImages(
  product: Product,
  signedUrlMap?: Map<string, string>,
): ProductImage[] {
  // Use the shared image-key resolver. Same merge contract as the
  // card, DataGrid, and backend `/image-urls` endpoint — single
  // source of truth for "the list of signable keys for this product".
  // See `lib/api/productImages.ts` for the regression context.
  const fallbackUrls = getProductImageKeys(product);
  // The cover key is the explicit source of truth; if it is missing
  // we fall back to the first image (handled by the helper).
  const coverKey = getCoverImageKey(product);
  const attrs = product.attributes;
  const rawImages =
    isRecord(attrs) && Array.isArray(attrs.images) ? attrs.images : [];

  const normalizedImages = rawImages.flatMap((image, index) => {
    if (
      !isRecord(image) ||
      typeof image.url !== "string" ||
      image.url.length === 0
    )
      return [];
    // SECURITY: never echo the raw internal-endpoint URL when no signed match
    // is found. The browser cannot fetch objects from the private bucket via
    // raw URLs (e.g. http://minio:9000/...) and the Next.js image allowlist
    // rejects unknown hostnames. Use `null` so the gallery shows its empty
    // state instead of feeding an unreachable URL to <Image>.
    const signed = signedUrlMap?.get(image.url);
    return [
      {
        id:
          typeof image.id === "string"
            ? image.id
            : `${product.id}-image-${index}`,
        product_id: product.id,
        url: signed ?? null,
        thumbnail_url:
          typeof image.thumbnail_url === "string"
            ? (signedUrlMap?.get(image.thumbnail_url) ?? null)
            : null,
        sort_order:
          typeof image.sort_order === "number" ? image.sort_order : index,
        is_primary: Boolean(image.is_primary),
        alt_text: typeof image.alt_text === "string" ? image.alt_text : null,
        created_at: product.created_at,
        updated_at: product.updated_at,
      },
    ];
  });

  if (normalizedImages.length > 0) {
    return normalizedImages.toSorted((l, r) => l.sort_order - r.sort_order);
  }

  return fallbackUrls.map((url, index) => {
    const signed = signedUrlMap?.get(url);
    return {
      id: `${product.id}-fallback-image-${index}`,
      product_id: product.id,
      // SECURITY: see note above — null when no signed match.
      url: signed ?? null,
      thumbnail_url: signed ?? null,
      sort_order: index,
      // The cover is the explicit `cover_image_key` (or the first
      // image when the cover is not set). The previous implementation
      // hard-coded `is_primary: index === 0` which is wrong once
      // the seller can pick a different cover.
      is_primary: url === coverKey,
      alt_text: `${product.title} image ${index + 1}`,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PulseBox({
  w = "100%",
  h = 16,
  radius = 8,
}: {
  w?: string | number;
  h?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: "var(--ps-bg-elevated)",
        animation: "psPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function DetailPageSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "32px 24px",
      }}
    >
      <style>{`@keyframes psPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <PulseBox w={120} h={36} />
        <PulseBox w={100} h={36} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 24,
        }}
      >
        <PulseBox h={420} radius={12} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PulseBox w="35%" h={14} />
            <PulseBox w="80%" h={32} />
            <PulseBox w="50%" h={28} />
            <PulseBox w="30%" h={20} />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <PulseBox key={i} h={72} radius={10} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail attribute card ────────────────────────────────────────────────────

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: "var(--ps-bg-elevated)",
        border: "1px solid var(--ps-border-subtle)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 500,
          color: "var(--ps-text-disabled)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ps-text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: "var(--ps-bg-surface)",
        border: "1px solid var(--ps-border-default)",
        borderRadius: 14,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CatalogDetailViewProps {
  productId: string;
}

export function CatalogDetailView({ productId }: CatalogDetailViewProps) {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const {
    data: product,
    error,
    isLoading,
    refetch,
  } = useProduct(productId, { internal: true });
  const { data: signedUrls } = useProductImageUrls(productId);
  const setBreadcrumbLabel = useBreadcrumbStore((state) => state.setLabel);
  const clearBreadcrumbLabel = useBreadcrumbStore((state) => state.clearLabel);

  // Register the real product title for the `[id]` breadcrumb segment so the
  // Header shows "Toyota Corolla 2020" instead of the generic "Detalle"
  // fallback. Cleared on unmount so it never leaks into the next route.
  useEffect(() => {
    const title = product?.title;
    if (!title) return;
    setBreadcrumbLabel(productId, title);
    return () => clearBreadcrumbLabel(productId);
  }, [product?.title, productId, setBreadcrumbLabel, clearBreadcrumbLabel]);

  // Build map of key → signed URL for O(1) lookup
  const signedUrlMap = new Map<string, string>(
    signedUrls?.images.map((img) => [img.key, img.url]) ?? [],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return <DetailPageSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 20,
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--ps-error-bg)",
            border: "1px solid var(--ps-error)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle
            size={24}
            strokeWidth={2}
            style={{ color: "var(--ps-error)" }}
          />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: "var(--ps-text-primary)",
            }}
          >
            No pudimos cargar este vehículo
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            {error?.message ?? "Intentá nuevamente desde el catálogo."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
              background: "var(--ps-bg-elevated)",
              border: "1px solid var(--ps-border-default)",
              color: "var(--ps-text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <Link
            href="/catalog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  // ── Data prep ──────────────────────────────────────────────────────────────
  const productImages = getProductImages(product, signedUrlMap);
  const vehicleAttributes = isVehicleAttributes(product.attributes)
    ? product.attributes
    : null;
  const mileage = vehicleAttributes ? formatMileage(vehicleAttributes) : null;

  const publishVehicleData = vehicleAttributes
    ? {
        id: product.id,
        title: product.title,
        description: product.description,
        price_cents: product.price_cents,
        zip_code: product.location_zip ?? "",
        image_urls: productImages.flatMap((img) => (img.url ? [img.url] : [])),
        tenant_id: product.tenant_id,
        year: vehicleAttributes.year,
        make: vehicleAttributes.make,
        model: vehicleAttributes.model,
        mileage: vehicleAttributes.mileage,
        body_style: vehicleAttributes.body_type,
        exterior_color: vehicleAttributes.exterior_color,
        interior_color: vehicleAttributes.interior_color,
        vehicle_condition: product.condition,
        fuel_type: vehicleAttributes.fuel_type,
        transmission: vehicleAttributes.transmission,
        clean_title: true,
        vin: vehicleAttributes.vin,
        vehicle_type: "car_truck",
      }
    : undefined;

  const attributeItems = vehicleAttributes
    ? [
        { label: "Año", value: String(vehicleAttributes.year) },
        { label: "Marca", value: vehicleAttributes.make },
        { label: "Modelo", value: vehicleAttributes.model },
        { label: "VIN", value: vehicleAttributes.vin },
        ...(mileage ? [{ label: "Millaje", value: mileage }] : []),
        ...(vehicleAttributes.trim
          ? [{ label: "Versión", value: vehicleAttributes.trim }]
          : []),
        ...(vehicleAttributes.body_type
          ? [{ label: "Carrocería", value: vehicleAttributes.body_type }]
          : []),
        ...(vehicleAttributes.transmission
          ? [{ label: "Transmisión", value: vehicleAttributes.transmission }]
          : []),
        ...(vehicleAttributes.drivetrain
          ? [{ label: "Tracción", value: vehicleAttributes.drivetrain }]
          : []),
        ...(vehicleAttributes.fuel_type
          ? [{ label: "Combustible", value: vehicleAttributes.fuel_type }]
          : []),
        ...(vehicleAttributes.exterior_color
          ? [{ label: "Color ext.", value: vehicleAttributes.exterior_color }]
          : []),
        ...(vehicleAttributes.interior_color
          ? [{ label: "Color int.", value: vehicleAttributes.interior_color }]
          : []),
        ...(vehicleAttributes.stock_number
          ? [{ label: "Stock", value: vehicleAttributes.stock_number }]
          : []),
      ]
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "8px 0",
        }}
      >
        {/* Action bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Back */}
          <Link
            href="/catalog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              background: "var(--ps-bg-elevated)",
              border: "1px solid var(--ps-border-default)",
              color: "var(--ps-text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Volver al catálogo
          </Link>

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              disabled={!publishVehicleData}
              onClick={() => setIsPublishModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                background: "var(--ps-bg-elevated)",
                border: "1px solid var(--ps-border-default)",
                color: "var(--ps-text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                opacity: publishVehicleData ? 1 : 0.5,
              }}
            >
              <Send size={14} strokeWidth={2} />
              Publicar
            </button>
            <Link
              href={`/catalog/${product.id}/edit`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                background: "var(--ps-cyan)",
                color: "var(--ps-bg-base)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <PencilLine size={14} strokeWidth={2} />
              Editar
            </Link>
          </div>
        </div>

        {/* Main grid: gallery | info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.15fr) minmax(320px,0.85fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Gallery */}
          <SectionCard style={{ padding: 16 }}>
            <ProductImageGallery images={productImages} />
          </SectionCard>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title + price + status */}
            <SectionCard>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--ps-text-disabled)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Detalle del vehículo
                  </p>
                  <h1
                    style={{
                      margin: "6px 0 0",
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "var(--ps-text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {product.title}
                  </h1>
                </div>
                {isGridStatus(product.status) ? (
                  <StatusBadge status={product.status} />
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "3px 12px",
                      borderRadius: 99,
                      background: "var(--ps-bg-elevated)",
                      border: "1px solid var(--ps-border-default)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--ps-text-secondary)",
                    }}
                  >
                    {product.status}
                  </span>
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--ps-cyan)",
                  letterSpacing: "-0.03em",
                }}
              >
                {formatCurrency(product.price_cents, product.currency)}
              </p>

              {product.description ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 13,
                    color: "var(--ps-text-secondary)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {product.description}
                </p>
              ) : (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 13,
                    color: "var(--ps-text-disabled)",
                    fontStyle: "italic",
                  }}
                >
                  Este vehículo todavía no tiene descripción cargada.
                </p>
              )}
            </SectionCard>

            {/* Attributes */}
            <SectionCard>
              <div style={{ marginBottom: 14 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ps-text-primary)",
                  }}
                >
                  Atributos del vehículo
                </h2>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 12,
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  Información clave para revisión interna y publicación.
                </p>
              </div>

              {attributeItems.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {attributeItems.map((item) => (
                    <DetailItem
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--ps-text-disabled)",
                  }}
                >
                  Este producto no tiene atributos de vehículo disponibles.
                </p>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      <PublishModal
        vehicleId={product.id}
        mode={isPublishModalOpen ? "publish" : null}
        vehicleData={publishVehicleData}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </>
  );
}
