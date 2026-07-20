"use client";

/**
 * ProductImageGallery — ProSell image viewer for catalog detail.
 *
 * Features:
 *   - Main image (aspect-video) with keyboard navigation (←/→)
 *   - Previous/Next arrow buttons (semi-transparent surface overlay)
 *   - Counter badge (bottom-right)
 *   - Thumbnail strip for quick selection
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types/product-image";
import { ChevronLeft, ChevronRight } from "@/components/icons/chevron";

interface ProductImageGalleryProps {
  images: ProductImage[];
  className?: string;
}

export function ProductImageGallery({
  images,
  className = "",
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  // SECURITY: filter out images whose URL is null/missing. `getProductImages`
  // returns `url: null` when the backend didn't have a signed URL for that key
  // (e.g. raw internal-endpoint URLs that the browser can't fetch). Showing
  // them would feed an unreachable URL to <Image> and break the allowlist.
  const renderableImages = (images ?? []).filter(
    (img): img is ProductImage & { url: string } =>
      typeof img.url === "string" && img.url.length > 0,
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < renderableImages.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) setCurrentIndex((prev) => prev - 1);
  };

  const goToNext = () => {
    if (hasNext) setCurrentIndex((prev) => prev + 1);
  };

  const selectImage = (index: number) => {
    setCurrentIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    else if (e.key === "ArrowRight") goToNext();
  };

  useEffect(() => {
    galleryRef.current?.focus();
  }, []);

  // Reset selection if the active image is no longer renderable.
  // The setState is conditional and only fires when currentIndex has fallen
  // out of range, so the cascading-render concern from the rule does not
  // apply here. Block-disable (not next-line) because the rule fires on the
  // setState call inside the effect body, not on the useEffect line itself.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentIndex >= renderableImages.length) {
      setCurrentIndex(0);
    }
  }, [renderableImages.length, currentIndex]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Empty state — shown when there are no images OR every image was filtered
  // out for having no signed URL.
  if (renderableImages.length === 0) {
    return (
      <div
        data-testid="image-gallery"
        role="region"
        aria-label="Product image gallery"
        className={`flex items-center justify-center aspect-video rounded-xl border border-dashed ${className}`.trim()}
        style={{
          background: "var(--ps-bg-elevated)",
          borderColor: "var(--ps-border-subtle)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--ps-text-tertiary)" }}>
          Sin imágenes disponibles
        </p>
      </div>
    );
  }

  const currentImage = renderableImages[currentIndex];

  return (
    <div
      ref={galleryRef}
      data-testid="image-gallery"
      role="region"
      aria-label="Product image gallery"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`flex flex-col gap-3 ${className}`.trim()}
      style={{ outline: "none" }}
    >
      {/* Main image */}
      <div
        className="relative aspect-video rounded-xl overflow-hidden"
        style={{
          background: "var(--ps-bg-elevated)",
        }}
      >
        <Image
          src={currentImage.url}
          alt={currentImage.alt_text ?? ""}
          fill
          style={{ objectFit: "contain" }}
          sizes="(max-width: 768px) 100vw, 50vw"
          // Bypass the `/_next/image` proxy: the URL is a MinIO presigned URL
          // host-bound to `S3_PUBLIC_ENDPOINT_URL`, which the server-side proxy
          // (running inside the Docker `web` container) cannot reach. The
          // browser fetches the signed URL directly. See `image-loader` history
          // and `tests/unit/components/catalog/ProductImageGallery.test.tsx`.
          unoptimized
        />

        {renderableImages.length > 1 && (
          <>
            {/* Prev arrow */}
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              aria-label="Imagen anterior"
              className="absolute left-2.5 top-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity transition-colors duration-150"
              style={{
                transform: "translateY(-50%)",
                background: "rgba(6,13,36,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                cursor: hasPrevious ? "pointer" : "default",
                opacity: hasPrevious ? 1 : 0.35,
              }}
              onMouseEnter={(e) => {
                if (hasPrevious)
                  e.currentTarget.style.background = "rgba(6,13,36,0.85)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(6,13,36,0.55)";
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Next arrow */}
            <button
              onClick={goToNext}
              disabled={!hasNext}
              aria-label="Imagen siguiente"
              className="absolute right-2.5 top-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity transition-colors duration-150"
              style={{
                transform: "translateY(-50%)",
                background: "rgba(6,13,36,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                cursor: hasNext ? "pointer" : "default",
                opacity: hasNext ? 1 : 0.35,
              }}
              onMouseEnter={(e) => {
                if (hasNext)
                  e.currentTarget.style.background = "rgba(6,13,36,0.85)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(6,13,36,0.55)";
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Counter badge */}
            <div
              className="absolute bottom-2.5 right-3 px-2.5 py-0.75 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(6,13,36,0.7)",
                backdropFilter: "blur(4px)",
                color: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {currentIndex + 1} / {renderableImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {renderableImages.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {renderableImages.map((image, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={image.id}
                onClick={() => selectImage(index)}
                aria-label={`Ver imagen ${index + 1}${image.alt_text ? `: ${image.alt_text}` : ""}`}
                aria-current={isActive ? "true" : undefined}
                className="flex-shrink-0 w-19 h-19 rounded-lg overflow-hidden relative cursor-pointer p-0 border-none transition-outline transition-transform duration-150"
                style={{
                  background: "var(--ps-bg-elevated)",
                  outline: isActive
                    ? "2px solid var(--ps-cyan)"
                    : "2px solid transparent",
                  outlineOffset: 2,
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.outline =
                      "2px solid var(--ps-border-medium)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.outline = "2px solid transparent";
                }}
              >
                <Image
                  src={image.thumbnail_url ?? image.url}
                  alt={image.alt_text ?? ""}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="76px"
                  // Same signed-URL bypass as the main image above — see the
                  // regression comment in the main <Image> for the rationale.
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
