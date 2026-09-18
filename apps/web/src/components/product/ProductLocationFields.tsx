"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * ProductLocationFields — per-product ubicación override (US2.1).
 *
 * Same ciudad/provincia text-pair pattern already used by
 * `OrganizationFormFields.tsx` for the organization's default location,
 * applied here at the product level (`Product.location_city`/
 * `location_state`, already exposed by the backend — no new contract,
 * `interaction-spec.md` § Campo de Ubicación con Indicador de Herencia).
 *
 * Fully controlled: `city`/`state` and their edits flow through `onChange`
 * — this component holds no location state of its own, only the inline
 * validation error (AC2.1.5).
 */

export interface ProductLocationFieldsProps {
  /** Ciudad actual (override del producto, o heredada de organización) */
  city: string | null;
  /** Provincia/Estado actual (override del producto, o heredado) */
  state: string | null;
  /** true cuando el par mostrado es el default de organización, sin override guardado */
  isInherited: boolean;
  /** Handler de cambio de valor de un campo individual */
  onChange: (field: "city" | "state", value: string) => void;
  /**
   * Handler de guardado. Llamado solo cuando el par es válido:
   * - ambos completados → override nuevo/actualizado.
   * - ambos vacíos (y había override) → `onSave(null, null)`, se
   *   interpreta como "volver a heredar" (AC2.1.5), no como error.
   * Un par PARCIAL (uno completado, el otro vacío) nunca llega a
   * `onSave` — se rechaza antes, con un error inline (AC2.1.5).
   */
  onSave: (city: string | null, state: string | null) => void;
  disabled?: boolean;
}

const inputClassName =
  "h-[38px] rounded-lg border border-ps-border-default bg-ps-elevated px-3 py-0 text-ps-text-primary";

const PARTIAL_PAIR_ERROR =
  "Completá ambos campos o dejalos vacíos para heredar el default de organización";

export function ProductLocationFields({
  city,
  state,
  isInherited,
  onChange,
  onSave,
  disabled,
}: ProductLocationFieldsProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedCity = (city ?? "").trim();
    const trimmedState = (state ?? "").trim();
    const bothEmpty = trimmedCity === "" && trimmedState === "";
    const bothFilled = trimmedCity !== "" && trimmedState !== "";

    // AC2.1.5: a partial pair (one filled, one empty) is rejected
    // client-side — never reaches onSave, saves a backend roundtrip.
    if (!bothEmpty && !bothFilled) {
      setError(PARTIAL_PAIR_ERROR);
      return;
    }

    setError(null);
    // AC2.1.5: an empty pair (after having had an override) reverts to
    // the organization default rather than persisting an empty override.
    onSave(bothEmpty ? null : trimmedCity, bothEmpty ? null : trimmedState);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          Ciudad
          <input
            type="text"
            value={city ?? ""}
            onChange={(e) => onChange("city", e.target.value)}
            disabled={disabled}
            aria-label="Ciudad"
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          Provincia
          <input
            type="text"
            value={state ?? ""}
            onChange={(e) => onChange("state", e.target.value)}
            disabled={disabled}
            aria-label="Provincia"
            className={inputClassName}
          />
        </label>
      </div>

      {/* AC2.1.2: real text, not just a color/icon — read in the normal
          tab order alongside both fields (accessibility-checklist.md). */}
      {isInherited && (
        <span className="text-sm text-muted-foreground" role="status">
          Heredado de organización
        </span>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={disabled}
        className="w-fit"
      >
        Guardar ubicación
      </Button>
    </div>
  );
}
