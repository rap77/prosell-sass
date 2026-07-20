"use client";

import { useState, type ElementType } from "react";
import {
  Plus,
  Car,
  Home,
  Package,
  Zap,
  SlidersHorizontal,
  Layers,
  Tractor,
  Globe,
  Type,
  Hash,
  ToggleRight,
  Check,
  Minus,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useCategories } from "@/lib/api/categories";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/category";

const T = {
  chipBg: "var(--ps-chip-bg)",
  nicheInactiveBg: "var(--ps-niche-inactive-bg)",
  switchOffBg: "var(--ps-switch-off-bg)",
  icoInactiveBg: "var(--ps-ico-inactive-bg)",
  icoInactiveBorder: "var(--ps-ico-inactive-border)",
  hoverBgSm: "var(--ps-hover-bg-sm)",
  hoverBgXs: "var(--ps-hover-bg-xs)",
  addCardBg: "var(--ps-add-card-bg)",
  addCardHoverBg: "var(--ps-add-card-hover-bg)",
  iconBtnHoverBorder: "var(--ps-icon-btn-hover-border)",
  tableRowHover: "var(--ps-table-row-hover)",
  tableDivider: "var(--ps-table-divider)",
  nicheActiveBorder: "var(--ps-niche-active-border)",
  nicheActiveBorderHover: "var(--ps-niche-active-border-hover)",
  nicheInactiveBorder: "var(--ps-niche-inactive-border)",
  nicheInactiveBorderHover: "var(--ps-niche-inactive-border-hover)",
  error: "var(--ps-error)",
} as const;

type IconEl = ElementType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
}>;

const NICHE_ICONS: Record<string, IconEl> = {
  vehiculos: Car,
  inmuebles: Home,
  maquinaria: Tractor,
  productos: Package,
};

function getNicheIcon(slug: string): IconEl {
  return NICHE_ICONS[slug.toLowerCase()] ?? Layers;
}

const NICHE_STATS: Record<
  string,
  { products: number; publications: number; leads: number }
> = {
  vehiculos: { products: 38, publications: 24, leads: 284 },
};

const CUSTOM_FIELDS: Array<{
  name: string;
  icon: IconEl;
  type: "text" | "number" | "boolean";
  required: boolean;
  visible: boolean;
}> = [
  { name: "Marca", icon: Type, type: "text", required: true, visible: true },
  { name: "Modelo", icon: Type, type: "text", required: true, visible: true },
  { name: "Año", icon: Hash, type: "number", required: true, visible: true },
  {
    name: "Kilometraje",
    icon: Hash,
    type: "number",
    required: true,
    visible: true,
  },
  { name: "Color", icon: Type, type: "text", required: false, visible: true },
  { name: "VIN", icon: Type, type: "text", required: false, visible: false },
  {
    name: "Financiación disponible",
    icon: ToggleRight,
    type: "boolean",
    required: false,
    visible: true,
  },
];

const TYPE_CHIPS = {
  text: {
    bgVar: "var(--ps-type-chip-text-bg)",
    colorVar: "var(--ps-cyan)",
    label: "Texto",
  },
  number: {
    bgVar: "var(--ps-type-chip-num-bg)",
    colorVar: "var(--ps-success)",
    label: "Número",
  },
  boolean: {
    bgVar: "var(--ps-type-chip-bool-bg)",
    colorVar: "var(--ps-warning)",
    label: "Boolean",
  },
} as const;

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative w-[38px] h-[22px] rounded-full border flex-shrink-0 cursor-pointer transition-all duration-150 ease-out",
        on ? "bg-ps-cyan border-ps-border-active" : "border-ps-border-subtle",
      )}
      style={{
        background: on ? undefined : T.switchOffBg,
        boxShadow: on ? "0 0 12px rgba(77,184,255,0.25)" : "none",
        transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-200 ease-out",
          on ? "left-[18px] bg-ps-base" : "left-[2px]",
        )}
        style={{ background: on ? undefined : "var(--ps-text-secondary)" }}
      />
    </button>
  );
}

function IconBtn({
  icon: Icon,
  danger = false,
  "aria-label": label,
}: {
  icon: IconEl;
  danger?: boolean;
  "aria-label"?: string;
}) {
  const [hov, setHov] = useState(false);
  const borderColor = hov
    ? danger
      ? "var(--ps-danger-hover-border)"
      : T.iconBtnHoverBorder
    : "transparent";
  const background = hov
    ? danger
      ? "var(--ps-danger-hover-bg)"
      : T.hoverBgSm
    : "transparent";
  const color = hov
    ? danger
      ? T.error
      : "var(--ps-cyan)"
    : "var(--ps-text-secondary)";
  return (
    <button
      type="button"
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-7 h-7 rounded-md border inline-flex items-center justify-center cursor-pointer transition-all duration-150"
      style={{
        borderColor,
        background,
        color,
      }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}

function GhostButton({ icon: Icon, label }: { icon: IconEl; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-9 px-[14px] rounded-lg border text-[13px] font-semibold cursor-pointer flex-1 transition-all duration-150",
        hov ? "border-ps-border-active" : "border-ps-border-default",
      )}
      style={{
        background: hov ? T.hoverBgXs : "transparent",
        color: "var(--ps-text-primary)",
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

function CtaButton({
  icon: Icon,
  label,
  onClick,
  full = false,
}: {
  icon: IconEl;
  label: string;
  onClick?: () => void;
  full?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border-0 font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap text-ps-bg-base",
        full ? "h-10 w-full text-[13.5px]" : "h-[38px] px-4 text-[13.5px]",
        hov ? "bg-ps-cyan-hover" : "bg-ps-cyan",
      )}
      style={{
        boxShadow: hov ? "0 6px 20px rgba(77,184,255,0.3)" : "none",
        transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </button>
  );
}

function NicheCard({
  category,
  onToggle,
}: {
  category: Category & { is_active: boolean };
  onToggle: (id: string, active: boolean) => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = getNicheIcon(category.slug);
  const active = category.is_active;
  const stats = NICHE_STATS[category.slug.toLowerCase()] ?? {
    products: 0,
    publications: 0,
    leads: 0,
  };
  const fields = Object.keys(category.attribute_schema);
  const shown = fields.slice(0, 6);
  const extra = Math.max(0, fields.length - 6);

  function resolveBorder(): string {
    if (active && hov) return T.nicheActiveBorderHover;
    if (active) return T.nicheActiveBorder;
    if (hov) return T.nicheInactiveBorderHover;
    return T.nicheInactiveBorder;
  }

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        "rounded-2xl p-6 flex flex-col transition-[border-color,transform] duration-200",
        active ? "bg-ps-surface" : undefined,
        active ? "gap-[18px]" : "gap-4",
      )}
      style={{
        background: active ? undefined : T.nicheInactiveBg,
        border: `1px solid ${resolveBorder()}`,
        transform: active && hov ? "translateY(-1px)" : "none",
      }}
    >
      {/* Head */}
      <div className="flex items-center gap-[14px]">
        <span
          className={cn(
            "w-[52px] h-[52px] rounded-xl inline-flex items-center justify-center flex-shrink-0 border",
            active ? "bg-ps-info-bg border-ps-border-medium" : undefined,
          )}
          style={{
            background: active ? undefined : T.icoInactiveBg,
            borderColor: active ? undefined : T.icoInactiveBorder,
            color: active ? "var(--ps-cyan)" : "var(--ps-text-tertiary)",
          }}
        >
          {
            // eslint-disable-next-line react-hooks/static-components -- lucide icons are stateless; resolving per render is intentional and cheap
            <Icon size={26} strokeWidth={1.75} />
          }
        </span>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <h2
            className="m-0 text-[20px] font-bold tracking-[-0.015em]"
            style={{
              color: active
                ? "var(--ps-text-primary)"
                : "var(--ps-text-secondary)",
            }}
          >
            {category.name}
          </h2>
          <span
            className={cn(
              "inline-flex items-center gap-[5px] text-[10.5px] font-bold px-[9px] py-[3px] rounded-full tracking-[0.08em] uppercase self-start",
              active ? "bg-ps-success-bg" : undefined,
            )}
            style={{
              background: active ? undefined : T.chipBg,
              color: active ? "var(--ps-success)" : "var(--ps-text-secondary)",
            }}
          >
            <span
              className={cn(
                "w-[5px] h-[5px] rounded-full",
                active ? "bg-ps-success" : "bg-ps-tertiary",
              )}
            />
            {active ? "Activo" : "Inactivo"}
          </span>
        </div>

        <Switch on={active} onClick={() => onToggle(category.id, !active)} />
      </div>

      {/* Stats */}
      <div
        className="flex flex-wrap gap-2"
        style={{ opacity: active ? 1 : 0.7 }}
      >
        {[
          { value: stats.products, label: "productos" },
          { value: stats.publications, label: "publicaciones" },
          { value: stats.leads, label: "leads" },
        ].map(({ value, label }) => (
          <span
            key={label}
            className={cn(
              "inline-flex items-baseline gap-[5px] px-3 py-[6px] border border-ps-border-subtle rounded-lg text-[12px] tabular-nums",
              active ? "text-ps-text-secondary" : "text-ps-tertiary",
            )}
            style={{ background: T.chipBg }}
          >
            <b
              className={cn(
                "text-[14px] font-bold tracking-[-0.01em]",
                active ? "text-ps-text-primary" : "text-ps-tertiary",
              )}
            >
              {value}
            </b>
            {label}
          </span>
        ))}
      </div>

      {/* Fields */}
      <div
        className="flex flex-col gap-2"
        style={{ opacity: active ? 1 : 0.5 }}
      >
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-ps-tertiary">
          Campos configurados
        </span>
        <div className="flex flex-wrap gap-[6px]">
          {shown.map((f) => (
            <span
              key={f}
              className="inline-flex items-center text-[11.5px] font-medium text-ps-text-secondary px-[9px] py-1 bg-ps-field-tag-bg border border-ps-border-subtle rounded-md"
            >
              {f}
            </span>
          ))}
          {extra > 0 && (
            <button
              type="button"
              className="text-[12px] font-semibold text-ps-cyan bg-transparent border-0 cursor-pointer px-1 py-1"
            >
              + {extra} más
            </button>
          )}
        </div>
      </div>

      {/* Channels (active only) */}
      {active && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-ps-tertiary">
            Canales
          </span>
          <div className="flex items-center gap-[10px]">
            <span className="inline-flex">
              {(
                [
                  { bg: "#1877F2", label: "f", color: "#fff", sm: false },
                  { bg: "#FF6600", label: "AT", color: "#fff", sm: true },
                  { bg: "#FFE600", label: "ML", color: "#1E1E1E", sm: true },
                ] as const
              ).map(({ bg, label, color, sm }, idx) => (
                <span
                  key={label}
                  className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[9px] font-extrabold border-[1.5px] border-ps-surface tracking-[-0.02em]"
                  style={{
                    background: bg,
                    color,
                    marginLeft: idx === 0 ? 0 : -6,
                    fontSize: sm ? 9 : 11,
                  }}
                >
                  {label}
                </span>
              ))}
              <span
                className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-ps-navy border-[1.5px] border-ps-surface"
                style={{ marginLeft: -6, color: "var(--ps-cyan)" }}
              >
                <Globe size={12} strokeWidth={2} />
              </span>
            </span>
            <span className="text-[12px] text-ps-text-secondary">
              <b className="text-ps-text-primary font-semibold">4 canales</b>{" "}
              conectados
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {active ? (
        <div className="flex gap-2 pt-[6px] border-t border-ps-border-subtle">
          <GhostButton icon={SlidersHorizontal} label="Configurar" />
          <GhostButton icon={Package} label="Ver productos" />
        </div>
      ) : (
        <CtaButton
          icon={Zap}
          label="Activar nicho"
          full
          onClick={() => onToggle(category.id, true)}
        />
      )}
    </article>
  );
}

function AddNicheCard({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        "rounded-2xl p-6 flex flex-col items-center justify-center gap-[10px] text-center cursor-pointer transition-all duration-200 ease-out min-h-[200px] border-2 border-dashed",
        hov ? "border-ps-border-strong" : "border-ps-border-default",
      )}
      style={{
        background: hov ? T.addCardHoverBg : T.addCardBg,
        transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <span className="w-14 h-14 rounded-[14px] bg-ps-info-bg border border-ps-border-medium text-ps-cyan inline-flex items-center justify-center">
        <Plus size={28} strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "text-[16px] font-semibold tracking-[-0.005em] transition-colors duration-200",
          hov ? "text-ps-text-primary" : "text-ps-text-secondary",
        )}
      >
        Agregar nicho
      </span>
      <span className="text-[12px] text-ps-tertiary inline-flex items-center flex-wrap justify-center gap-x-[10px] gap-y-1">
        {(
          [
            { Icon: Package, label: "Productos" },
            { Icon: Home, label: "Inmuebles" },
            { Icon: Tractor, label: "Maquinaria" },
          ] as const
        ).map(({ Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <Icon size={12} strokeWidth={2} color="var(--ps-text-secondary)" />
            <b className="font-medium text-ps-text-secondary">{label}</b>
          </span>
        ))}
        <b className="font-medium text-ps-text-secondary">y más</b>
      </span>
    </article>
  );
}

function AddFieldButton() {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cn(
        "w-full h-10 rounded-lg text-ps-cyan text-[13px] font-semibold cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 border-[1.5px] border-dashed",
        hov ? "border-ps-border-active" : "border-ps-border-medium",
      )}
      style={{
        background: hov ? T.hoverBgSm : "transparent",
      }}
    >
      <Plus size={14} strokeWidth={2.5} />
      Agregar campo personalizado
    </button>
  );
}

function CustomFieldsCard({ contextLabel }: { contextLabel: string }) {
  const COLS = [
    "Nombre del campo",
    "Tipo",
    "Requerido",
    "Visible en listing",
    "",
  ];
  return (
    <section className="bg-ps-surface border border-ps-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-5 border-b border-ps-border-subtle">
        <div className="flex flex-col gap-[2px]">
          <h3 className="m-0 text-[15px] font-semibold tracking-[-0.005em] text-ps-text-primary">
            Campos personalizados
          </h3>
          <span className="text-[11.5px] text-ps-tertiary tracking-[-0.01em]">
            aplica a ·{" "}
            <b className="text-ps-cyan font-semibold tracking-normal">
              {contextLabel}
            </b>
          </span>
        </div>
        <button
          type="button"
          className="text-[12.5px] font-medium text-ps-cyan inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
        >
          Gestionar
          <ChevronDown size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Table */}
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {COLS.map((col) => (
              <th
                key={col}
                className={cn(
                  "text-[10.5px] font-bold tracking-[0.1em] uppercase text-ps-tertiary py-3 px-[14px] border-b border-ps-border-subtle",
                  col === "" ? "text-right" : "text-left",
                  col === "Nombre del campo" && "pl-5",
                )}
                style={{ background: T.chipBg }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CUSTOM_FIELDS.map((field) => {
            const chip = TYPE_CHIPS[field.type];
            return <FieldRow key={field.name} field={field} chip={chip} />;
          })}
        </tbody>
      </table>

      <div className="py-3 px-5 border-t border-ps-border-subtle">
        <AddFieldButton />
      </div>
    </section>
  );
}

function FieldRow({
  field,
  chip,
}: {
  field: (typeof CUSTOM_FIELDS)[number];
  chip: (typeof TYPE_CHIPS)[keyof typeof TYPE_CHIPS];
}) {
  const [rowHov, setRowHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setRowHov(true)}
      onMouseLeave={() => setRowHov(false)}
      className="transition-colors duration-150"
      style={{
        background: rowHov ? T.tableRowHover : "transparent",
      }}
    >
      <td
        className="py-3 pl-5 pr-[14px] text-[13px] text-ps-text-primary align-middle"
        style={{ borderBottom: `1px solid ${T.tableDivider}` }}
      >
        <span className="flex items-center gap-[10px]">
          <field.icon
            size={14}
            strokeWidth={2}
            color="var(--ps-text-tertiary)"
          />
          <span className="font-medium">{field.name}</span>
        </span>
      </td>
      <td
        className="py-3 px-[14px] align-middle"
        style={{ borderBottom: `1px solid ${T.tableDivider}` }}
      >
        <span
          className="inline-flex items-center text-[11px] font-semibold px-2 py-[3px] rounded-full tracking-[-0.005em] font-mono"
          style={{ background: chip.bgVar, color: chip.colorVar }}
        >
          {chip.label}
        </span>
      </td>
      {([field.required, field.visible] as const).map((val, i) => (
        <td
          key={i}
          className="py-3 px-[14px] align-middle"
          style={{ borderBottom: `1px solid ${T.tableDivider}` }}
        >
          <span
            className={cn(
              "inline-flex items-center gap-[5px] text-[12px] font-medium",
              val ? "text-ps-success" : "text-ps-tertiary",
            )}
          >
            {val ? (
              <Check size={13} strokeWidth={2.5} />
            ) : (
              <Minus size={13} strokeWidth={2.5} />
            )}
            {val ? "Sí" : "No"}
          </span>
        </td>
      ))}
      <td
        className="py-3 pr-5 pl-[14px] text-right align-middle"
        style={{ borderBottom: `1px solid ${T.tableDivider}` }}
      >
        <div className="inline-flex gap-1">
          <IconBtn icon={Pencil} aria-label="Editar" />
          <IconBtn icon={Trash2} aria-label="Eliminar" danger />
        </div>
      </td>
    </tr>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[280px] bg-ps-surface rounded-2xl border border-ps-border-subtle opacity-50"
          />
        ))}
      </div>
      <div className="h-[320px] bg-ps-surface rounded-xl border border-ps-border-subtle opacity-50" />
    </div>
  );
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories();
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({});

  const resolveActive = (cat: Category) =>
    localActive[cat.id] !== undefined ? localActive[cat.id] : cat.is_active;

  const handleToggle = (id: string, active: boolean) => {
    setLocalActive((prev) => ({ ...prev, [id]: active }));
    // TODO: PATCH /api/v1/categories/{id} once backend supports toggle
  };

  const firstActive = categories.find((c) => resolveActive(c));

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="mb-4" style={{ color: T.error }}>
          Error al cargar las categorías
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-ps-cyan text-ps-bg-base border-0 rounded-lg cursor-pointer font-semibold text-[13px]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-[26px]">
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-bold tracking-[-0.015em] text-ps-text-primary">
            Categorías
          </h1>
          <p className="m-0 text-[13px] text-ps-text-secondary">
            Gestioná los nichos activos en tu cuenta
          </p>
        </div>
        <CtaButton icon={Plus} label="Nueva categoría" />
      </div>

      {/* Niches grid */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        {categories.map((cat) => (
          <NicheCard
            key={cat.id}
            category={{ ...cat, is_active: resolveActive(cat) }}
            onToggle={handleToggle}
          />
        ))}
        <AddNicheCard onClick={() => {}} />
      </div>

      {/* Custom fields */}
      {firstActive && <CustomFieldsCard contextLabel={firstActive.name} />}
    </div>
  );
}
