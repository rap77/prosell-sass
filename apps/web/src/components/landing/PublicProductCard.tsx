"use client";

/**
 * PublicProductCard — one card of the public catalog grid (workbook 4.6).
 *
 * Reuses the internal catalog card PATTERN (image + title + meta, shadcn
 * token layer) without the internal concerns (edit/delete/share actions,
 * org tags, presentation contract). The whole card links to the product's
 * public page (/p/[slug], already live).
 *
 * Signed image URLs must render `unoptimized` (next.config.ts: the S3
 * signature is host-bound, the server-side /_next/image fetch cannot
 * reach the storage endpoint) — same as VehicleCard/ProductImageGallery.
 */

import Image from "next/image";
import { MapPin } from "lucide-react";
import type { PublicProductItem } from "@/lib/api/publicProducts";

export interface PublicProductCardProps {
  product: PublicProductItem;
}

export function PublicProductCard({ product }: PublicProductCardProps) {
  const price = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: product.currency,
  }).format(product.price_cents / 100);

  const location = [product.location_city, product.location_state]
    .filter(Boolean)
    .join(", ");

  return (
    <a
      href={`/p/${product.slug}`}
      className="group block overflow-hidden rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {product.cover_url ? (
          <Image
            src={product.cover_url}
            alt={product.title}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-sm"
            style={{ color: "var(--ps-text-tertiary)" }}
          >
            Sin imagen
          </div>
        )}
      </div>

      <div className="space-y-1 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">{product.title}</h3>
        <p className="text-base font-bold">{price}</p>
        {location ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} aria-hidden="true" />
            {location}
          </p>
        ) : null}
      </div>
    </a>
  );
}
