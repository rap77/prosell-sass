"use client";

/**
 * HeroShotSelector — ProSell publisher.
 *
 * Click any thumbnail to promote it to hero (index 0).
 * Selected thumbnail shows a cyan PORTADA badge + outline.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import Image from "next/image";
import { useState } from "react";

// ============================================
// TYPES
// ============================================

interface HeroShotSelectorProps {
  images: string[];
  heroIndex: number;
  onHeroChange: (index: number) => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * HeroShotSelector — click any image to move it to index 0 (hero shot).
 *
 * UX decision (locked in CONTEXT.md): simple click = hero, NOT drag & drop.
 * The selected image shows a "PORTADA" badge with a cyan outline.
 */
export function HeroShotSelector({
  images,
  heroIndex,
  onHeroChange,
}: HeroShotSelectorProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <p className="text-xs italic text-secondary">No hay fotos disponibles.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {images.map((url, index) => {
        const isSelected = index === heroIndex;
        const isHovered = hoveredIndex === index;

        return (
          <button
            key={url}
            type="button"
            onClick={() => onHeroChange(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            aria-label={
              isSelected
                ? `Foto ${index + 1} — portada seleccionada`
                : `Seleccionar foto ${index + 1} como portada`
            }
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-elevated p-0 transition-colors duration-150"
            style={{
              border: isSelected
                ? "2px solid var(--ps-cyan)"
                : isHovered
                  ? "2px solid var(--ps-border-medium)"
                  : "2px solid transparent",
              outline: isSelected ? "2px solid var(--ps-cyan)" : "none",
              outlineOffset: isSelected ? 2 : 0,
            }}
          >
            <Image
              src={url}
              alt={`Foto ${index + 1}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 25vw, 150px"
              // Bypass the `/_next/image` proxy: `url` is a MinIO presigned
              // URL host-bound to `S3_PUBLIC_ENDPOINT_URL`, which the
              // server-side proxy (running inside the Docker `web` container)
              // cannot reach. The browser fetches the signed URL directly.
              // Regression guard: tests/unit/components/publisher/HeroShotSelector.test.tsx
              unoptimized
            />
            {isSelected && (
              <span className="absolute top-1 left-1 bg-cyan text-base rounded px-1.5 py-0.5 text-xs font-black tracking-wider">
                PORTADA
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
