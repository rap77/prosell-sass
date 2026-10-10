"use client";

/**
 * LandingCatalog — the public catalog section on the landing page
 * (workbook bloque 4, ítem 4.6 — §7 del diagnóstico).
 *
 * Buscador + filtros (condición, rango de precio) + grilla marketplace-style;
 * cada card linkea a /p/[slug] (la página pública ya existente). Los datos
 * vienen de GET /api/v1/public/products vía el proxy BFF — sin autenticación,
 * por diseño: el visitante público nunca pasa por el RBAC interno.
 */

import { useState } from "react";
import { usePublicProducts } from "@/lib/api/publicProducts";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { PublicProductCard } from "./PublicProductCard";
import { Loader2, Search } from "lucide-react";

const CONDITION_OPTIONS = [
  { value: "", label: "Cualquier condición" },
  { value: "new", label: "Nuevo" },
  { value: "used", label: "Usado" },
  { value: "certified_pre_owned", label: "Certificado" },
  { value: "refurbished", label: "Reacondicionado" },
  { value: "for_parts", label: "Para repuestos" },
] as const;

const SEARCH_DEBOUNCE_MS = 300;

export function LandingCatalog() {
  const [searchInput, setSearchInput] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const filters = {
    search: search || undefined,
    condition: condition || undefined,
    min_price: minPrice ? Number(minPrice) : undefined,
    max_price: maxPrice ? Number(maxPrice) : undefined,
  };

  const { data: products = [], isLoading, error } = usePublicProducts(filters);

  return (
    <section
      id="catalogo"
      className="mx-auto w-full max-w-6xl px-6 py-16"
      aria-label="Catálogo público"
    >
      <div className="mb-8 space-y-2 text-center">
        <h2
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "var(--ps-text-primary)" }}
        >
          Catálogo
        </h2>
        <p className="text-sm" style={{ color: "var(--ps-text-secondary)" }}>
          Explorá los vehículos publicados por nuestros dealers.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título o descripción..."
            aria-label="Buscar vehículos"
            className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          aria-label="Filtrar por condición"
          className="h-10 rounded-md border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Precio mín."
          aria-label="Precio mínimo"
          className="h-10 w-32 rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Precio máx."
          aria-label="Precio máximo"
          className="h-10 w-32 rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="py-12 text-center text-sm"
          style={{ color: "var(--ps-error)" }}
        >
          Error al cargar el catálogo. Intentá de nuevo en unos momentos.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" aria-label="Cargando catálogo" />
        </div>
      ) : products.length === 0 ? (
        <p
          className="py-12 text-center text-sm"
          style={{ color: "var(--ps-text-secondary)" }}
        >
          No hay vehículos publicados que coincidan con tu búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <PublicProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
