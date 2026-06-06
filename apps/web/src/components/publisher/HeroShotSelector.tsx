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
      <p style={{ fontSize: 13, color: 'var(--ps-text-secondary)', fontStyle: 'italic' }}>
        No hay fotos disponibles.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: 8,
              overflow: 'hidden',
              border: isSelected
                ? '2px solid var(--ps-cyan)'
                : isHovered
                  ? '2px solid var(--ps-border-medium)'
                  : '2px solid transparent',
              outline: isSelected ? '2px solid var(--ps-cyan)' : 'none',
              outlineOffset: isSelected ? 2 : 0,
              background: 'var(--ps-bg-elevated)',
              cursor: 'pointer',
              padding: 0,
              transition: 'border-color 0.15s',
            }}
          >
            <Image
              src={url}
              alt={`Foto ${index + 1}`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 25vw, 150px"
              // Bypass the `/_next/image` proxy: `url` is a MinIO presigned
              // URL host-bound to `S3_PUBLIC_ENDPOINT_URL`, which the
              // server-side proxy (running inside the Docker `web` container)
              // cannot reach. The browser fetches the signed URL directly.
              // Regression guard: tests/unit/components/publisher/HeroShotSelector.test.tsx
              unoptimized
            />
            {isSelected && (
              <span style={{
                position: 'absolute',
                top: 4,
                left: 4,
                background: 'var(--ps-cyan)',
                color: 'var(--ps-bg-base)',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                PORTADA
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
