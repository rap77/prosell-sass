"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, PencilLine, Send } from "lucide-react";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import type { Vehicle } from "@/components/datagrid/DataGrid";
import { PublishModal } from "@/components/publisher/PublishModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/lib/api/products";
import type { Product } from "@/types/product";
import type { ProductImage } from "@/types/product-image";
import { isVehicleAttributes, type VehicleAttributes } from "@/types/vehicle";
import { ProductImageGallery } from "./ProductImageGallery";

const SUPPORTED_STATUS = {
  pending: true,
  published: true,
  sold: true,
  draft: true,
} as const;

interface CatalogDetailViewProps {
  productId: string;
}

interface DetailItemProps {
  label: string;
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function isGridStatus(
  status: Product["status"],
): status is Extract<Product["status"], Vehicle["status"]> {
  return status in SUPPORTED_STATUS;
}

function formatCurrency(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function formatMileage(attrs: VehicleAttributes): string | null {
  if (typeof attrs.mileage !== "number") {
    return null;
  }

  const unit = attrs.mileage_unit === "km" ? "km" : "miles";
  return `${attrs.mileage.toLocaleString("en-US")} ${unit}`;
}

function getProductImages(product: Product): ProductImage[] {
  const productLevelUrls = isRecord(product)
    ? getStringArray(product.image_urls)
    : [];
  const attrs = product.attributes;
  const attributeLevelUrls = isRecord(attrs)
    ? getStringArray(attrs.image_urls)
    : [];
  const rawImages =
    isRecord(attrs) && Array.isArray(attrs.images) ? attrs.images : [];

  const normalizedImages = rawImages.flatMap((image, index) => {
    if (!isRecord(image) || typeof image.url !== "string" || image.url.length === 0) {
      return [];
    }

    return [
      {
        id: typeof image.id === "string" ? image.id : `${product.id}-image-${index}`,
        product_id: product.id,
        url: image.url,
        thumbnail_url:
          typeof image.thumbnail_url === "string" ? image.thumbnail_url : null,
        sort_order: typeof image.sort_order === "number" ? image.sort_order : index,
        is_primary: Boolean(image.is_primary),
        alt_text: typeof image.alt_text === "string" ? image.alt_text : null,
        created_at: product.created_at,
        updated_at: product.updated_at,
      },
    ];
  });

  if (normalizedImages.length > 0) {
    return normalizedImages.toSorted(
      (left, right) => left.sort_order - right.sort_order,
    );
  }

  const fallbackUrls =
    productLevelUrls.length > 0 ? productLevelUrls : attributeLevelUrls;

  return fallbackUrls.map((url, index) => ({
    id: `${product.id}-fallback-image-${index}`,
    product_id: product.id,
    url,
    thumbnail_url: url,
    sort_order: index,
    is_primary: index === 0,
    alt_text: `${product.title} image ${index + 1}`,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }));
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Skeleton className="min-h-[420px] w-full rounded-2xl" />

        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-28" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogDetailView({ productId }: CatalogDetailViewProps) {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const { data: product, error, isLoading, refetch } = useProduct(productId, {
    internal: true,
  });

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <span aria-hidden="true" className="text-2xl">
            !
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            No pudimos cargar este vehículo
          </h1>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "Intentá nuevamente desde el catálogo."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
          <Button asChild>
            <Link href="/catalog">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const productImages = getProductImages(product);
  const vehicleAttributes = isVehicleAttributes(product.attributes)
    ? product.attributes
    : null;
  const publishVehicleData = vehicleAttributes
    ? {
        id: product.id,
        title: product.title,
        description: product.description,
        price_cents: product.price_cents,
        zip_code: product.location_zip ?? "",
        image_urls: productImages.map((image) => image.url),
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
  const mileage = vehicleAttributes ? formatMileage(vehicleAttributes) : null;
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
          ? [{ label: "Color exterior", value: vehicleAttributes.exterior_color }]
          : []),
        ...(vehicleAttributes.interior_color
          ? [{ label: "Color interior", value: vehicleAttributes.interior_color }]
          : []),
        ...(vehicleAttributes.stock_number
          ? [{ label: "Stock", value: vehicleAttributes.stock_number }]
          : []),
      ]
    : [];

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild type="button" variant="ghost" className="gap-2">
            <Link href="/catalog">
              <ArrowLeft className="h-4 w-4" />
              Volver al catálogo
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!publishVehicleData}
              onClick={() => setIsPublishModalOpen(true)}
            >
              <Send className="h-4 w-4" />
              Publicar
            </Button>
            <Button asChild className="gap-2">
              <Link href={`/catalog/${product.id}/edit`}>
                <PencilLine className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <ProductImageGallery images={productImages} />
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">
                    Detalle del vehículo
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {product.title}
                  </h1>
                </div>

                {isGridStatus(product.status) ? (
                  <StatusBadge status={product.status} />
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    {product.status}
                  </span>
                )}
              </div>

              <p className="mt-4 text-3xl font-bold text-foreground">
                {formatCurrency(product.price_cents, product.currency)}
              </p>

              {product.description ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {product.description}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Este vehículo todavía no tiene descripción cargada.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Atributos del vehículo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Información clave usada para revisión interna y publicación.
                </p>
              </div>

              {attributeItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {attributeItems.map((item) => (
                    <DetailItem
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este producto no tiene atributos de vehículo disponibles.
                </p>
              )}
            </section>
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
