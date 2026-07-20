"use client";

import { useState } from "react";
import {
  Car,
  Anchor,
  Plane,
  Home,
  Building2,
  Package,
  ShoppingBag,
  Smartphone,
  Shirt,
  Refrigerator,
  Bike,
  Truck,
  Ship,
  MapPin,
  Caravan,
  Container,
  MoreHorizontal,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import type { VerticalResponse, CategoryNode } from "@/types/category";

// ponytail: slug → icon, Package as fallback
const SLUG_ICON: Record<string, LucideIcon> = {
  // Vehículos y Transporte
  "vehiculos-y-transporte": Car,
  "vehiculos-terrestres": Car,
  "vehiculos-acuaticos-nautica": Anchor,
  "vehiculos-aereos": Plane,
  "carros-y-camionetas": Car,
  motos: Bike,
  "vehiculos-pesados-y-comerciales": Truck,
  "embarcaciones-de-recreo": Ship,
  "vehiculos-personales": Ship,
  // Bienes Raíces
  "bienes-raices": Home,
  "propiedades-residenciales": Home,
  "propiedades-comerciales-e-industriales": Building2,
  "terrenos-y-lotes": MapPin,
  casas: Home,
  apartamentos: Building2,
  // Artículos
  articulos: ShoppingBag,
  "tecnologia-y-electronica": Smartphone,
  "moda-y-calzado": Shirt,
  "hogar-y-electrodomesticos": Refrigerator,
  // Otros terrestres
  "otros-terrestres": MoreHorizontal,
  "rvs-y-motorhomes": Caravan,
  remolques: Container,
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
    return <p className="text-xs text-tertiary">Cargando categorías...</p>;
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

  // Build breadcrumb path for display
  const breadcrumbPath = breadcrumb.map((level) => getName(level));

  return (
    <section aria-label={`Categorías de ${getName(current)}`}>
      {/* Breadcrumb trail */}
      <div className="flex items-center gap-2 mb-4 text-xs text-secondary flex-wrap">
        <button
          type="button"
          onClick={() => setBreadcrumb([])}
          className="bg-none border-none cursor-pointer text-tertiary p-0 text-xs"
        >
          Inicio
        </button>
        {breadcrumbPath.map((name, idx) => (
          <span key={idx} className="flex items-center gap-2">
            <span className="text-tertiary">/</span>
            <button
              type="button"
              onClick={() => setBreadcrumb(breadcrumb.slice(0, idx + 1))}
              className={`bg-none border-none p-0 text-xs ${
                idx === breadcrumbPath.length - 1
                  ? "cursor-default text-primary font-semibold"
                  : "cursor-pointer text-tertiary font-normal"
              }`}
            >
              {name}
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setBreadcrumb(breadcrumb.slice(0, -1))}
        className="inline-flex items-center gap-1.5 bg-none border-none cursor-pointer text-secondary text-xs p-0 mb-5"
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Volver
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
      className="grid auto-fill gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
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
      className={`flex flex-col items-center cursor-pointer text-center transition-[border-color,background] duration-150 w-full rounded-lg bg-elevated border border-default ${
        size === "lg" ? "gap-2.5 px-5 py-8" : "gap-2.5 px-4 py-6"
      }`}
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
        className="text-cyan"
      />
      <span
        className={`font-semibold text-primary leading-tight ${
          size === "lg" ? "text-sm" : "text-xs"
        }`}
      >
        {label}
      </span>
      {sublabel && <span className="text-xs text-tertiary">{sublabel}</span>}
    </button>
  );
}
