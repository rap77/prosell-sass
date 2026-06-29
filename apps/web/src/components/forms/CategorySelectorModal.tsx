"use client";

import { useState } from "react";
import {
  Car,
  Anchor,
  Plane,
  Home,
  Package,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import type { VerticalResponse, CategoryNode } from "@/types/category";

// ponytail: slug → icon, Package as fallback
const SLUG_ICON: Record<string, LucideIcon> = {
  vehiculos: Car,
  "vehiculos-terrestres": Car,
  terrestres: Car,
  "vehiculos-acuaticos": Anchor,
  acuaticos: Anchor,
  nautica: Anchor,
  "vehiculos-aereos": Plane,
  aereos: Plane,
  inmuebles: Home,
  "real-estate": Home,
  casas: Home,
};

function resolveIcon(slug: string): LucideIcon {
  return SLUG_ICON[slug.toLowerCase().replace(/_/g, "-")] ?? Package;
}

interface Props {
  verticals: VerticalResponse[];
  onSelect: (category: CategoryNode) => void;
}

export function CategorySelectorModal({ verticals, onSelect }: Props) {
  const [activeVertical, setActiveVertical] = useState<VerticalResponse | null>(
    null,
  );

  if (verticals.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--ps-text-tertiary)" }}>
        Cargando categorías...
      </p>
    );
  }

  // Single vertical → skip step 1
  const active = verticals.length === 1 ? verticals[0] : activeVertical;
  const canGoBack = verticals.length > 1 && active !== null;

  if (active) {
    return (
      <section aria-label={`Categorías de ${active.name}`}>
        {canGoBack && (
          <button
            type="button"
            onClick={() => setActiveVertical(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ps-text-secondary)",
              fontSize: 13,
              padding: 0,
              marginBottom: 20,
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Volver a tipos
          </button>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {active.categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              label={cat.name}
              Icon={resolveIcon(cat.slug)}
              onClick={() => onSelect(cat)}
            />
          ))}
        </div>
      </section>
    );
  }

  // Step 1: vertical picker
  return (
    <section aria-label="Tipo de producto">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {verticals.map((v) => (
          <CategoryCard
            key={v.id}
            label={v.name}
            sublabel={`${v.categories.length} ${v.categories.length === 1 ? "categoría" : "categorías"}`}
            Icon={resolveIcon(v.slug)}
            size="lg"
            onClick={() => setActiveVertical(v)}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({
  label,
  sublabel,
  Icon,
  size = "md",
  onClick,
}: {
  label: string;
  sublabel?: string;
  Icon: LucideIcon;
  size?: "md" | "lg";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: size === "lg" ? "32px 20px" : "24px 16px",
        background: "var(--ps-bg-elevated)",
        border: "1px solid var(--ps-border-default)",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "center",
        transition: "border-color 150ms, background 150ms",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ps-cyan)";
        e.currentTarget.style.background = "var(--ps-hover-bg-xs)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ps-border-default)";
        e.currentTarget.style.background = "var(--ps-bg-elevated)";
      }}
    >
      <Icon
        size={size === "lg" ? 36 : 28}
        strokeWidth={1.5}
        style={{ color: "var(--ps-cyan)" }}
      />
      <span
        style={{
          fontSize: size === "lg" ? 15 : 13,
          fontWeight: 600,
          color: "var(--ps-text-primary)",
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 11, color: "var(--ps-text-tertiary)" }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}
