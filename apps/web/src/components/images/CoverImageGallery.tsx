"use client";

/**
 * CoverImageGallery — single source of truth for the "grid of images
 * with click-to-set cover" UX, now with drag & drop reordering.
 *
 * Consumed today by `forms/ProductCoverPicker.tsx`, the single
 * store-backed picker used by ProductForm for BOTH create and edit.
 * The picker reads the unified image list (in-flight + seeded) from
 * the Zustand `uploadStore` and renders it through this gallery.
 *
 * The component is PURE: it does not know about stores, fetch, or
 * router. It takes data in and emits cover-pick/reorder events out.
 * That keeps the contract small, the test surface tight, and the
 * same UX available to any future consumer.
 *
 * Image source: the consumer passes the `url` (blob URL for fresh
 * uploads, signed URL for existing images). The component renders
 * `<Image unoptimized>` for both — signed MinIO URLs cannot go
 * through `/_next/image` (the proxy 400s on them; see the catalog
 * `unoptimized` regression history) and blob URLs do not benefit
 * from the proxy.
 */

import Image from "next/image";
import { GripVertical, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * One tile in the gallery.
 *
 * - `id` is a stable React key + the argument for `onRemove(id)`.
 *   The consumer may use a UUID, a storage key, a temp upload id —
 *   whatever fits.
 * - `key` is the storage key (e.g. `orgs/<uuid>/vehicles/<file>.jpg`).
 *   It is the argument for `onCoverChange(key)` and is what the
 *   backend expects as `cover_image_key`.
 * - `url` is what the user actually sees: a blob URL during upload,
 *   or a signed MinIO URL on the edit form. The component passes it
 *   to `<Image>` verbatim.
 */
export interface CoverImageItem {
  id: string;
  key: string;
  url: string;
}

export interface CoverImageGalleryProps {
  images: CoverImageItem[];
  /** Storage key of the current cover, or null when none. */
  coverKey: string | null;
  /** Emitted with the picked key when the user clicks a non-cover tile. */
  onCoverChange: (key: string) => void;
  /**
   * Optional. When provided, each tile gets a remove button (X) and
   * `onRemove(id)` is emitted on click. Read-only consumers (e.g. the
   * detail view) omit this and get a clean grid with no X buttons.
   */
  onRemove?: (id: string) => void;
  /**
   * Optional. When provided, enables drag & drop reordering. Called
   * with (fromIndex, toIndex) when an image is dragged to a new position.
   */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Locks interaction while a mutation is in flight. */
  disabled?: boolean;
}

/**
 * SortableImageTile — individual draggable tile within the gallery.
 * Extracted to use the useSortable hook per-item.
 */
function SortableImageTile({
  image,
  index,
  isCover,
  onCoverChange,
  onRemove,
  isDraggable,
  disabled,
}: {
  image: CoverImageItem;
  index: number;
  isCover: boolean;
  onCoverChange: (key: string) => void;
  onRemove?: (id: string) => void;
  isDraggable: boolean;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: !isDraggable || disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`cover-image-tile-${image.id}`}
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border cursor-pointer transition-shadow",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        isCover && "ring-2 ring-primary ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        isDragging && "shadow-2xl scale-105 opacity-90",
      )}
    >
      {/* Clickable area for setting cover */}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onCoverChange(image.key);
        }}
        disabled={disabled}
        aria-label={`Set ${image.key.split("/").pop()} as cover`}
        aria-pressed={isCover}
        className="absolute inset-0 z-0 focus:outline-none"
      />

      <Image
        src={image.url}
        alt={`Imagen ${index + 1}`}
        fill
        unoptimized
        className="object-cover pointer-events-none"
        draggable={false}
      />

      {/* Cover badge — only on the cover tile */}
      {isCover && (
        <div
          data-testid="cover-badge"
          className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10"
        >
          <Star className="w-3 h-3" />
          Cover
        </div>
      )}

      {/* Set-as-cover hint — only on non-cover tiles, only on hover */}
      {!isCover && !isDragging && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-white text-sm font-medium flex items-center gap-1">
            <Star className="w-4 h-4" />
            Set as Cover
          </span>
        </div>
      )}

      {/* Drag handle — only when reordering is enabled */}
      {isDraggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Drag to reorder image ${index + 1}`}
          className={cn(
            "absolute bottom-2 left-2 bg-background/80 hover:bg-background p-1.5 rounded-full transition-opacity z-20 cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100",
            isDragging && "opacity-100",
          )}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Optional remove button — opt-in via `onRemove` */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            onRemove(image.id);
          }}
          disabled={disabled}
          aria-label={`Remove image ${index + 1}`}
          data-testid={`cover-image-remove-${image.id}`}
          className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function CoverImageGallery({
  images,
  coverKey,
  onCoverChange,
  onRemove,
  onReorder,
  disabled = false,
}: CoverImageGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px movement before drag starts to avoid
        // accidental drags when clicking to set cover
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  };

  if (images.length === 0) return null;

  const isDraggable = !!onReorder;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map((img) => img.id)}
        strategy={rectSortingStrategy}
      >
        <div
          data-testid="cover-image-gallery"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {images.map((image, index) => (
            <SortableImageTile
              key={image.id}
              image={image}
              index={index}
              isCover={image.key === coverKey}
              onCoverChange={onCoverChange}
              onRemove={onRemove}
              isDraggable={isDraggable}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
