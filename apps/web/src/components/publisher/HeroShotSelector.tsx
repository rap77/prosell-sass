"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

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
 * The selected image shows a "PORTADA" badge with a blue border ring.
 */
export function HeroShotSelector({
  images,
  heroIndex,
  onHeroChange,
}: HeroShotSelectorProps) {
  if (images.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No hay fotos disponibles.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((url, index) => (
        <button
          key={url}
          type="button"
          onClick={() => onHeroChange(index)}
          className={cn(
            "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
            index === heroIndex
              ? "border-blue-500 ring-2 ring-blue-300"
              : "border-transparent hover:border-slate-300",
          )}
          aria-label={
            index === heroIndex
              ? `Foto ${index + 1} — portada seleccionada`
              : `Seleccionar foto ${index + 1} como portada`
          }
        >
          <Image
            src={url}
            alt={`Foto ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 25vw, 150px"
          />
          {index === heroIndex && (
            <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              PORTADA
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
