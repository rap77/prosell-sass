"use client";

import Image from "next/image";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import type { Product } from "@/types/product";
import type {
  AttributeSchemaEntry,
  CategoryPresentation,
} from "@/types/category";
import { composeSubtitle } from "@/lib/utils/composeSubtitle";
import { formatCardField } from "@/lib/utils/formatCardField";
import { placeholderForVertical } from "@/lib/utils/placeholderForVertical";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";

const MAX_META_CELLS = 4;

export interface ProductCardProps {
  product: Product;
  presentation: CategoryPresentation | null;
  attributeSchema: Record<string, AttributeSchemaEntry>;
  productAttributes: Record<string, unknown>;
  verticalSlug: string | null;
  imageUrl: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Pure presentational ProductCard (Subsystem A).
 *
 * Renders a single product in the catalog grid from the category's
 * `presentation` contract. No data fetching, no store reads, no side
 * effects — the container (`catalog/page.tsx`) is the source of truth
 * for `imageUrl`, `presentation`, `attributeSchema`, and `verticalSlug`.
 *
 * Styling uses the shadcn token layer (mapped in `tailwind.config.ts`):
 *   border   → `--border`        (`hsl(var(--border))`)
 *   card     → `--card`          (`hsl(var(--card))`)         — surface
 *   muted    → `--muted`         (`hsl(var(--muted))`)        — image bg / hover
 *   fg       → `--foreground`    (`hsl(var(--foreground))`)   — primary text
 *   muted-fg → `--muted-foreground` (label text)
 *   destr.   → `--destructive`   (delete button text)
 *
 * Per project convention (Tailwind 4 / CLAUDE.md) we do NOT use
 * `var(--ps-*)` in className — those ProSell-prefixed tokens are reserved
 * for inline `style={{ ... }}` (see `catalog/page.tsx`).
 *
 * Spec: docs/superpowers/specs/2026-06-09-subsystem-a-productcard-design.md
 */
export function ProductCard({
  product,
  presentation,
  attributeSchema,
  productAttributes,
  verticalSlug,
  imageUrl,
  onView,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const placeholder = placeholderForVertical(verticalSlug);

  // --- Subtitle (client-side, per §7) ---
  const subtitle = presentation
    ? composeSubtitle(presentation.subtitle_template, productAttributes)
    : "";

  // --- Card fields meta grid (max 4, skip cells with missing values) ---
  const metaCells = (presentation?.card_fields ?? [])
    .slice(0, MAX_META_CELLS)
    .map((field) =>
      formatCardField(field, productAttributes[field.key], attributeSchema),
    )
    .filter((cell) => cell.value !== null);

  // --- Price (separate slot) ---
  // Spec §8 says "never crash". `Intl.NumberFormat` throws on a malformed
  // currency string; the backend currently types `Product.currency` as a
  // wide `string` (not a strict ISO-4217 union). Wrap in try/catch with
  // a USD fallback so a bad value renders rather than blowing up the card.
  let price: string;
  try {
    price = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: product.currency || "USD",
    }).format(product.price_cents / 100);
  } catch {
    price = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
    }).format(product.price_cents / 100);
  }

  // --- Image (cover vs. niche placeholder) ---
  const imgSrc = imageUrl ?? placeholder;
  // Placeholders are local + branded → optimize. Signed MinIO URLs are
  // host-bound (next.config.ts comment) → unoptimized to bypass the
  // server-side `/_next/image` fetch (which can't reach MinIO).
  const unoptimized = Boolean(imageUrl);

  // Map Product.status (8 literals) → VehicleStatus (7 literals) so the
  // legacy StatusBadge can render the badge. Pinned by the mapper's
  // `satisfies` annotation to stay exhaustive at compile time.
  const badgeStatus = mapProductStatusToVehicleStatus(product.status);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      {/* Image (4:3) */}
      <div className="relative aspect-[4/3] w-full bg-muted">
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className={imageUrl ? "object-cover" : "object-contain p-6"}
          unoptimized={unoptimized}
          priority={false}
        />
        {/* Status badge — top-right (spec §4). The wrapper is positioning
            only; the badge's own `data-testid="vehicle-status"` must pass
            through unchanged so DataGrid tests that rely on it keep working. */}
        <div className="absolute right-2 top-2">
          <StatusBadge status={badgeStatus} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {product.title}
        </h3>

        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}

        <p className="text-base font-bold text-foreground">{price}</p>

        {metaCells.length > 0 && (
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {metaCells.map((cell) => (
              <div key={cell.key} className="flex flex-col">
                <dt className="text-muted-foreground">{cell.label}</dt>
                <dd className="font-medium text-foreground">{cell.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Actions — visually hidden by default; revealed on mouse hover OR
          keyboard focus-within (a11y: WCAG 2.1.1 Keyboard). The toolbar
          stays in the a11y tree so screen readers and keyboard users
          can Tab onto Ver/Editar/Eliminar. The visual reveal is purely
          CSS-driven — no React state, no aria-hidden toggle. */}
      <div
        data-testid="product-card-actions"
        role="toolbar"
        aria-label="Acciones del producto"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 border-t border-border bg-card/95 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      >
        <button
          type="button"
          onClick={onView}
          className="rounded p-1.5 hover:bg-muted"
          aria-label="Ver detalle"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-1.5 hover:bg-muted"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1.5 text-destructive hover:bg-muted"
          aria-label="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
