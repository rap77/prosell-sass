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
import { ShareMenu } from "@/components/ui/ShareMenu";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumbStore";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import type { ProductRow } from "@/components/datagrid/DataGrid";
import { PublishModal } from "@/components/publisher/PublishModal";
import { useProduct, useProductImageUrls } from "@/lib/api/products";
import type { Product } from "@/types/product";
import type { ProductImage } from "@/types/product-image";
import { isVehicleAttributes, type VehicleAttributes } from "@/types/vehicle";
import { getCoverImageKey, getProductImageKeys } from "@/lib/api/productImages";
import { ProductImageGallery } from "./ProductImageGallery";
import { cn } from "@/lib/utils";

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
): status is Extract<Product["status"], ProductRow["status"]> {
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
      className="bg-ps-elevated"
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        animation: "psPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-8 px-6">
      <style>{`@keyframes psPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      <div className="flex items-center justify-between gap-3">
        <PulseBox w={120} h={36} />
        <PulseBox w={100} h={36} />
      </div>
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
        <PulseBox h={420} radius={12} />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <PulseBox w="35%" h={14} />
            <PulseBox w="80%" h={32} />
            <PulseBox w="50%" h={28} />
            <PulseBox w="30%" h={20} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
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
    <div className="py-3 px-3.5 rounded-[10px] bg-ps-elevated border border-ps-border-subtle">
      <p className="m-0 text-[11px] font-medium text-ps-text-tertiary uppercase tracking-[0.06em]">
        {label}
      </p>
      <p className="mt-1 m-0 text-[13px] font-semibold text-ps-text-primary">
        {value}
      </p>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-ps-surface border border-ps-border-default rounded-[14px] p-6",
        className,
      )}
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
  const { data: signedUrls, isPending: isPendingUrls } =
    useProductImageUrls(productId);
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || isPendingUrls) return <DetailPageSkeleton />;

  // Build map of key → signed URL for O(1) lookup (after loading guard)
  const signedUrlMap = new Map<string, string>(
    (signedUrls?.images ?? []).map((img) => [img.key, img.url]),
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 py-12 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-ps-error-bg border border-destructive flex items-center justify-center">
          <AlertCircle size={24} strokeWidth={2} className="text-destructive" />
        </div>
        <div>
          <h1 className="m-0 text-xl font-semibold text-ps-text-primary">
            No pudimos cargar este vehículo
          </h1>
          <p className="mt-1.5 m-0 text-[13px] text-ps-text-secondary">
            {error?.message ?? "Intentá nuevamente desde el catálogo."}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            className="h-9 px-4 rounded-lg bg-ps-elevated border border-ps-border-default text-ps-text-secondary text-[13px] font-medium cursor-pointer"
          >
            Reintentar
          </button>
          <Link
            href="/catalog"
            className="inline-flex items-center h-9 px-4 rounded-lg bg-ps-cyan text-ps-base text-[13px] font-semibold no-underline"
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
        description: product.description ?? undefined,
        price_cents: product.price_cents,
        zip_code: product.location_zip ?? "",
        image_urls: productImages.flatMap((img) => (img.url ? [img.url] : [])),
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
      <div className="flex flex-col gap-6 py-2">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Back */}
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-ps-elevated border border-ps-border-default text-ps-text-secondary text-[13px] font-medium no-underline"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Volver al catálogo
          </Link>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!publishVehicleData}
              onClick={() => setIsPublishModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-ps-elevated border border-ps-border-default text-ps-text-secondary text-[13px] font-medium cursor-pointer disabled:opacity-50"
            >
              <Send size={14} strokeWidth={2} />
              Publicar
            </button>
            <ShareMenu
              productTitle={product.title}
              productSlug={product.slug}
              isPublished={product.published_to_marketplace ?? false}
            />
            <Link
              href={`/catalog/${product.id}/edit`}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-ps-cyan text-ps-base text-[13px] font-semibold no-underline"
            >
              <PencilLine size={14} strokeWidth={2} />
              Editar
            </Link>
          </div>
        </div>

        {/* Main grid: gallery | info */}
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6 items-start">
          {/* Gallery */}
          <SectionCard className="p-4">
            <ProductImageGallery images={productImages} />
          </SectionCard>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Title + price + status */}
            <SectionCard>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="m-0 text-[11px] font-semibold text-ps-text-tertiary uppercase tracking-[0.1em]">
                    Detalle del vehículo
                  </p>
                  <h1 className="mt-1.5 m-0 text-2xl font-bold tracking-[-0.02em] text-ps-text-primary leading-[1.2]">
                    {product.title}
                  </h1>
                </div>
                {isGridStatus(product.status) ? (
                  <StatusBadge status={product.status} />
                ) : (
                  <span className="inline-flex py-[3px] px-3 rounded-full bg-ps-elevated border border-ps-border-default text-xs font-medium text-ps-text-secondary">
                    {product.status}
                  </span>
                )}
              </div>

              <p className="m-0 text-[28px] font-bold text-ps-cyan tracking-[-0.03em]">
                {formatCurrency(product.price_cents, product.currency)}
              </p>

              {product.description ? (
                <p className="mt-3 m-0 text-[13px] text-ps-text-secondary leading-[1.6] whitespace-pre-wrap">
                  {product.description}
                </p>
              ) : (
                <p className="mt-3 m-0 text-[13px] text-ps-text-tertiary italic">
                  Este vehículo todavía no tiene descripción cargada.
                </p>
              )}
            </SectionCard>

            {/* Attributes */}
            <SectionCard>
              <div className="mb-3.5">
                <h2 className="m-0 text-sm font-semibold text-ps-text-primary">
                  Atributos del vehículo
                </h2>
                <p className="mt-[3px] m-0 text-xs text-ps-text-secondary">
                  Información clave para revisión interna y publicación.
                </p>
              </div>

              {attributeItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {attributeItems.map((item) => (
                    <DetailItem
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : (
                <p className="m-0 text-[13px] text-ps-text-tertiary">
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
