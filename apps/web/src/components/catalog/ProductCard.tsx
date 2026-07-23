"use client";

import Image from "next/image";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/datagrid/StatusBadge";
import { ShareMenu } from "@/components/ui/ShareMenu";
import type { Product } from "@/types/product";
import type {
  AttributeSchemaEntry,
  CategoryPresentation,
} from "@/types/category";
import { composeSubtitle } from "@/lib/utils/composeSubtitle";
import { formatCardField } from "@/lib/utils/formatCardField";
import { placeholderForVertical } from "@/lib/utils/placeholderForVertical";
import { mapProductStatusToVehicleStatus } from "@/lib/utils/mapProductStatusToVehicleStatus";

// ponytail: WCAG luminance check — returns true if color is light (needs dark text)
function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

const MAX_META_CELLS = 4;

export interface ProductCardProps {
  product: Product;
  presentation: CategoryPresentation | null;
  attributeSchema: Record<string, AttributeSchemaEntry>;
  productAttributes: Record<string, unknown>;
  verticalSlug: string | null;
  imageUrl: string | null;
  /** Organization code/abbreviation shown as tag (internal pages only) */
  orgCode?: string | null;
  /** Organization tag color (hex, e.g. "#4DB8FF"). Falls back to primary. */
  orgColor?: string | null;
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
  orgCode,
  orgColor,
  onView,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const placeholder = placeholderForVertical(verticalSlug);

  // --- Subtitle (client-side, per §7) ---
  const subtitle = presentation
    ? composeSubtitle(presentation.subtitle_template ?? null, productAttributes)
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
  const imgSrc = imageUrl || placeholder;
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
      {/* Image (4:3) — clickable, triggers onView like the Eye button */}
      <button
        type="button"
        onClick={onView}
        className="relative aspect-[4/3] w-full bg-muted cursor-pointer"
        aria-label="Ver detalle del producto"
      >
        <Image
          src={imgSrc}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
          unoptimized={unoptimized}
          priority={false}
        />
        {/* Org code tag — top-left (internal pages only). Uses org color
            when provided, else falls back to primary tokens. */}
        {orgCode && (
          <span
            className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase shadow-sm ${
              orgColor && isLightColor(orgColor)
                ? "text-gray-900"
                : "text-white"
            }`}
            style={
              orgColor
                ? { backgroundColor: orgColor }
                : { backgroundColor: "var(--ps-primary)" }
            }
          >
            {orgCode}
          </span>
        )}
        {/* Status badge — top-right (spec §4). The wrapper is positioning
            only; the badge's own `data-testid="vehicle-status"` must pass
            through unchanged so DataGrid tests that rely on it keep working. */}
        <div className="absolute right-2 top-2">
          <StatusBadge status={badgeStatus} />
        </div>
      </button>

      {/* Body — ponytail: pb-14 on mobile to prevent toolbar overlap, md:pb-4 on desktop (hover reveals toolbar) */}
      <div className="flex flex-col gap-2 p-4 pb-14 md:pb-4">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {product.title}
        </h3>

        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}

        {/* ponytail: bigger price on mobile for readability (text-lg → 18px, md:text-xl → 20px) */}
        <p className="text-lg font-bold text-foreground md:text-xl">{price}</p>

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

      {/* Actions — ponytail: always visible on mobile (bg-card opaque), hidden on desktop until hover (bg-card/95 semi-transparent).
          Mobile users need permanent access to actions; desktop users get cleaner cards with hover reveal. */}
      <div
        data-testid="product-card-actions"
        role="toolbar"
        aria-label="Acciones del producto"
        className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 border-t border-border bg-card px-2 py-1.5 transition-opacity md:pointer-events-none md:bg-card/95 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
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
        <ShareMenu
          productTitle={product.title}
          productSlug={product.slug}
          isPublished={product.published_to_marketplace ?? false}
        />
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
