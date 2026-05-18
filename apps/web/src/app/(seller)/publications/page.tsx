"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Rocket, RefreshCcw } from "lucide-react";
import { PublishModal } from "@/components/publisher/PublishModal";
import { PublicationStatus } from "@/components/publisher/PublicationStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFacebookPages,
  type PublicationResponse,
} from "@/lib/api/publisherApi";
import { useProducts } from "@/lib/api/products";
import type { Product, ProductWithVehicle } from "@/types/product";
import { isVehicleProduct } from "@/types/product";

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

function isPublicationListStatus(value: string): value is PublicationListStatus {
  return (
    value === "pending" ||
    value === "publishing" ||
    value === "published" ||
    value === "failed" ||
    value === "expired" ||
    value === "sold"
  );
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

function getProductImageUrls(product: Product): string[] {
  const productLevelUrls = isRecord(product)
    ? getStringArray(product.image_urls)
    : [];
  const attrs = product.attributes;
  const attributeLevelUrls = isRecord(attrs)
    ? getStringArray(attrs.image_urls)
    : [];
  const rawImages =
    isRecord(attrs) && Array.isArray(attrs.images) ? attrs.images : [];

  const normalizedImages = rawImages.flatMap((image) => {
    if (!isRecord(image) || typeof image.url !== "string" || image.url.length === 0) {
      return [];
    }

    return [image.url];
  });

  if (normalizedImages.length > 0) {
    return normalizedImages;
  }

  return productLevelUrls.length > 0 ? productLevelUrls : attributeLevelUrls;
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

function toPublishableVehicleData(product: ProductWithVehicle): PublishableVehicleData {
  const attrs = product.attributes;

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price_cents: product.price_cents,
    zip_code: product.location_zip ?? "",
    image_urls: getProductImageUrls(product),
    tenant_id: product.tenant_id,
    year: attrs.year,
    make: attrs.make,
    model: attrs.model,
    mileage: attrs.mileage,
    body_style: attrs.body_type,
    exterior_color: attrs.exterior_color,
    interior_color: attrs.interior_color,
    vehicle_condition: product.condition,
    fuel_type: attrs.fuel_type,
    transmission: attrs.transmission,
    clean_title: true,
    vin: attrs.vin,
    vehicle_type: "car_truck",
  };
}

function buildPublicationRows(products: Product[]): PublicationRow[] {
  return products.flatMap((product) => {
    const status = mapProductStatusToPublicationStatus(product);

    if (!status || !isVehicleProduct(product)) {
      return [];
    }

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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EmptyState({
  canPublish,
  onOpenModal,
}: {
  canPublish: boolean;
  onOpenModal: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <Rocket className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-foreground">
        Todavía no tienes publicaciones
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Cuando publiques un vehículo en Facebook Marketplace aparecerá aquí con su estado más reciente.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          className="gap-2"
          disabled={!canPublish}
          onClick={onOpenModal}
        >
          <Plus className="h-4 w-4" />
          Nueva publicación
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/catalog">Ir al catálogo</Link>
        </Button>
      </div>
    </div>
  );
}

function PublicationsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  );
}

export default function PublicationsPage() {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [optimisticPublications, setOptimisticPublications] = useState<PublicationRow[]>([]);
  const { data: products, isLoading, error, refetch } = useProducts();
  const {
    data: facebookPages,
    isLoading: isLoadingFacebookPages,
  } = useFacebookPages();

  const productList = products ?? [];
  const publishableVehicles = productList.flatMap((product) => {
    if (!isVehicleProduct(product)) {
      return [];
    }

    if (product.status === "archived" || product.status === "sold") {
      return [];
    }

    return [toPublishableVehicleData(product)];
  });

  const publicationRows = [...optimisticPublications, ...buildPublicationRows(productList)]
    .toSorted(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );

  const canCreatePublication =
    publishableVehicles.length > 0 && !isLoadingFacebookPages;

  const handlePublished = (
    publication: PublicationResponse,
    vehicleData: PublishableVehicleData,
  ) => {
    setOptimisticPublications((current) => {
      const remaining = current.filter((item) => item.id !== publication.id);

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
        ...remaining,
      ];
    });
  };

  if (isLoading) {
    return <PublicationsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">
            No pudimos cargar las publicaciones
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error.message}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button type="button" variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
            <Button asChild type="button">
              <Link href="/catalog">Volver al catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Publicaciones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administra tus publicaciones de Facebook Marketplace y lanza nuevas desde el catálogo.
            </p>
          </div>

          <Button
            type="button"
            className="gap-2"
            disabled={!canCreatePublication}
            onClick={() => setIsPublishModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nueva publicación
          </Button>
        </div>

        {facebookPages && facebookPages.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No hay páginas de Facebook conectadas todavía. Puedes abrir el modal, pero necesitarás conectar una página antes de publicar.
          </div>
        ) : null}

        {publicationRows.length === 0 ? (
          <EmptyState
            canPublish={canCreatePublication}
            onOpenModal={() => setIsPublishModalOpen(true)}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Plataforma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Última actualización
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publicationRows.map((publication) => (
                  <tr key={publication.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {publication.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID producto: {publication.productId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {publication.platform}
                    </td>
                    <td className="px-6 py-4">
                      <PublicationStatus status={publication.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(publication.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
