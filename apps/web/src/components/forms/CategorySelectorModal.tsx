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

type NavLevel =
  | { kind: "vertical"; item: VerticalResponse }
  | { kind: "node"; item: CategoryNode };

function getChildren(level: NavLevel): CategoryNode[] {
  return level.kind === "vertical"
    ? level.item.categories
    : (level.item.children ?? []);
}

function getName(level: NavLevel): string {
  return level.item.name;
}

export function CategorySelectorModal({ verticals, onSelect }: Props) {
  const [breadcrumb, setBreadcrumb] = useState<NavLevel[]>([]);

  if (verticals.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--ps-text-tertiary)" }}>
        Cargando categorías...
      </p>
    );
  }

  // Level 0: show verticals
  if (breadcrumb.length === 0) {
    return (
      <section aria-label="Tipo de producto">
        <Grid>
          {verticals.map((v) => (
            <CategoryCard
              key={v.id}
              label={v.name}
              sublabel={`${v.categories.length} ${v.categories.length === 1 ? "categoría" : "categorías"}`}
              Icon={resolveIcon(v.slug)}
              size="lg"
              onClick={() => setBreadcrumb([{ kind: "vertical", item: v }])}
            />
          ))}
        </Grid>
      </section>
    );
  }

  const current = breadcrumb[breadcrumb.length - 1];
  const nodes = getChildren(current);

  return (
    <section aria-label={`Categorías de ${getName(current)}`}>
      <button
        type="button"
        onClick={() => setBreadcrumb(breadcrumb.slice(0, -1))}
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
        {breadcrumb.length === 1
          ? "Volver a tipos"
          : getName(breadcrumb[breadcrumb.length - 2])}
      </button>

      <Grid>
        {nodes.map((node) => {
          const isLeaf = !node.children || node.children.length === 0;
          return (
            <CategoryCard
              key={node.id}
              label={node.name}
              sublabel={
                !isLeaf && node.children
                  ? `${node.children.length} ${node.children.length === 1 ? "categoría" : "categorías"}`
                  : undefined
              }
              Icon={resolveIcon(node.slug)}
              onClick={() => {
                if (isLeaf) {
                  onSelect(node);
                } else {
                  setBreadcrumb([...breadcrumb, { kind: "node", item: node }]);
                }
              }}
            />
          );
        })}
      </Grid>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
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
