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

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  const renderableImages = useMemo(
    () =>
      (images ?? []).filter(
        (img): img is ProductImage & { url: string } =>
          typeof img.url === "string" && img.url.length > 0,
      ),
    [images],
  );

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < renderableImages.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) setCurrentIndex((prev) => prev - 1);
  }, [hasPrevious]);

  const goToNext = useCallback(() => {
    if (hasNext) setCurrentIndex((prev) => prev + 1);
  }, [hasNext]);

  const selectImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      else if (e.key === "ArrowRight") goToNext();
    },
    [goToPrevious, goToNext],
  );

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
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: "16/9",
          borderRadius: 12,
          background: "var(--ps-bg-elevated)",
          border: "1px dashed var(--ps-border-subtle)",
        }}
      >
        <p style={{ fontSize: 13, color: "var(--ps-text-disabled)" }}>
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
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        outline: "none",
      }}
    >
      {/* Main image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          borderRadius: 12,
          overflow: "hidden",
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
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(6,13,36,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                cursor: hasPrevious ? "pointer" : "default",
                opacity: hasPrevious ? 1 : 0.35,
                transition: "opacity 150ms, background 150ms",
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
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(6,13,36,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
                color: "#fff",
                cursor: hasNext ? "pointer" : "default",
                opacity: hasNext ? 1 : 0.35,
                transition: "opacity 150ms, background 150ms",
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
              style={{
                position: "absolute",
                bottom: 10,
                right: 12,
                padding: "3px 10px",
                borderRadius: 99,
                background: "rgba(6,13,36,0.7)",
                backdropFilter: "blur(4px)",
                fontSize: 12,
                fontWeight: 600,
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
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {renderableImages.map((image, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={image.id}
                onClick={() => selectImage(index)}
                aria-label={`Ver imagen ${index + 1}${image.alt_text ? `: ${image.alt_text}` : ""}`}
                aria-current={isActive ? "true" : undefined}
                style={{
                  flexShrink: 0,
                  width: 76,
                  height: 76,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                  background: "var(--ps-bg-elevated)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  outline: isActive
                    ? "2px solid var(--ps-cyan)"
                    : "2px solid transparent",
                  outlineOffset: 2,
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                  transition: "outline 150ms, transform 150ms",
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
