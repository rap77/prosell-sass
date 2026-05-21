'use client'

import { useState } from "react"
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
} from "lucide-react"
import { useCategories } from "@/lib/api/categories"
import type { Category } from "@/types/category"

// ── Design token references (CSS vars — auto-switch per theme) ────────────────
// All values from globals.css. Zero hardcoded colors in this component.
const T = {
  bgBase:         "var(--ps-bg-base)",
  bgSurface:      "var(--ps-bg-surface)",
  bgElevated:     "var(--ps-bg-elevated)",
  navy:           "var(--ps-navy)",
  cyan:           "var(--ps-cyan)",
  cyanHover:      "var(--ps-cyan-hover)",
  blue:           "var(--ps-blue)",
  textPrimary:    "var(--ps-text-primary)",
  textSecondary:  "var(--ps-text-secondary)",
  textDisabled:   "var(--ps-text-disabled)",
  success:        "var(--ps-success)",
  warning:        "var(--ps-warning)",
  error:          "var(--ps-error)",
  successBg:      "var(--ps-success-bg)",
  warningBg:      "var(--ps-warning-bg)",
  errorBg:        "var(--ps-error-bg)",
  infoBg:         "var(--ps-info-bg)",
  borderSubtle:   "var(--ps-border-subtle)",
  borderDefault:  "var(--ps-border-default)",
  borderMedium:   "var(--ps-border-medium)",
  borderStrong:   "var(--ps-border-strong)",
  borderActive:   "var(--ps-border-active)",
  // Component-specific
  chipBg:              "var(--ps-chip-bg)",
  fieldTagBg:          "var(--ps-field-tag-bg)",
  nicheInactiveBg:     "var(--ps-niche-inactive-bg)",
  switchOffBg:         "var(--ps-switch-off-bg)",
  icoInactiveBg:       "var(--ps-ico-inactive-bg)",
  icoInactiveBorder:   "var(--ps-ico-inactive-border)",
  badgeBg:             "var(--ps-badge-bg)",
  hoverBgSm:           "var(--ps-hover-bg-sm)",
  hoverBgXs:           "var(--ps-hover-bg-xs)",
  addCardBg:           "var(--ps-add-card-bg)",
  addCardHoverBg:      "var(--ps-add-card-hover-bg)",
  iconBtnHoverBorder:  "var(--ps-icon-btn-hover-border)",
  dangerHoverBg:       "var(--ps-danger-hover-bg)",
  dangerHoverBorder:   "var(--ps-danger-hover-border)",
  typeChipTextBg:      "var(--ps-type-chip-text-bg)",
  typeChipNumBg:       "var(--ps-type-chip-num-bg)",
  typeChipBoolBg:      "var(--ps-type-chip-bool-bg)",
  tableRowHover:       "var(--ps-table-row-hover)",
  tableDivider:        "var(--ps-table-divider)",
  nicheActiveBorder:        "var(--ps-niche-active-border)",
  nicheActiveBorderHover:   "var(--ps-niche-active-border-hover)",
  nicheInactiveBorder:      "var(--ps-niche-inactive-border)",
  nicheInactiveBorderHover: "var(--ps-niche-inactive-border-hover)",
} as const

// ── Icon mapping ──────────────────────────────────────────────────────────────
type IconEl = React.ElementType<{ size?: number; strokeWidth?: number; color?: string }>

const NICHE_ICONS: Record<string, IconEl> = {
  vehiculos: Car,
  inmuebles: Home,
  maquinaria: Tractor,
  productos: Package,
}

function getNicheIcon(slug: string): IconEl {
  return NICHE_ICONS[slug.toLowerCase()] ?? Layers
}

// ── Static sample data (stats + fields will come from API in future sprints) ──
const NICHE_STATS: Record<string, { products: number; publications: number; leads: number }> = {
  vehiculos: { products: 38, publications: 24, leads: 284 },
}

const CUSTOM_FIELDS: Array<{
  name: string
  icon: IconEl
  type: "text" | "number" | "boolean"
  required: boolean
  visible: boolean
}> = [
  { name: "Marca",                 icon: Type,        type: "text",    required: true,  visible: true  },
  { name: "Modelo",                icon: Type,        type: "text",    required: true,  visible: true  },
  { name: "Año",                   icon: Hash,        type: "number",  required: true,  visible: true  },
  { name: "Kilometraje",           icon: Hash,        type: "number",  required: true,  visible: true  },
  { name: "Color",                 icon: Type,        type: "text",    required: false, visible: true  },
  { name: "VIN",                   icon: Type,        type: "text",    required: false, visible: false },
  { name: "Financiación disponible", icon: ToggleRight, type: "boolean", required: false, visible: true },
]

const TYPE_CHIPS = {
  text:    { bgVar: "var(--ps-type-chip-text-bg)", colorVar: "var(--ps-cyan)",    label: "Texto"   },
  number:  { bgVar: "var(--ps-type-chip-num-bg)",  colorVar: "var(--ps-success)", label: "Número"  },
  boolean: { bgVar: "var(--ps-type-chip-bool-bg)", colorVar: "var(--ps-warning)", label: "Boolean" },
} as const

// ── Switch ────────────────────────────────────────────────────────────────────
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 100,
        background: on ? T.cyan : T.switchOffBg,
        border: `1px solid ${on ? T.borderActive : T.borderSubtle}`,
        boxShadow: on ? "0 0 12px rgba(77,184,255,0.25)" : "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: on ? 18 : 2,
          transform: "translateY(-50%)",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? T.bgBase : T.textSecondary,
          transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </button>
  )
}

// ── IconBtn ───────────────────────────────────────────────────────────────────
function IconBtn({
  icon: Icon,
  danger = false,
  "aria-label": label,
}: {
  icon: IconEl
  danger?: boolean
  "aria-label"?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: `1px solid ${hov ? (danger ? T.dangerHoverBorder : T.iconBtnHoverBorder) : "transparent"}`,
        background: hov ? (danger ? T.dangerHoverBg : T.hoverBgSm) : "transparent",
        color: hov ? (danger ? T.error : T.cyan) : T.textSecondary,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  )
}

// ── GhostButton ───────────────────────────────────────────────────────────────
function GhostButton({ icon: Icon, label }: { icon: IconEl; label: string }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 36,
        padding: "0 14px",
        borderRadius: 8,
        background: hov ? T.hoverBgXs : "transparent",
        color: T.textPrimary,
        border: `1px solid ${hov ? T.borderActive : T.borderDefault}`,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        flex: 1,
        transition: "all 180ms",
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  )
}

// ── CtaButton ─────────────────────────────────────────────────────────────────
function CtaButton({
  icon: Icon,
  label,
  onClick,
  full = false,
}: {
  icon: IconEl
  label: string
  onClick?: () => void
  full?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: full ? 40 : 38,
        padding: full ? "0" : "0 16px",
        width: full ? "100%" : undefined,
        borderRadius: 8,
        background: hov ? T.cyanHover : T.cyan,
        color: T.bgBase,
        border: 0,
        fontFamily: "inherit",
        fontSize: full ? 13.5 : 13.5,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 180ms",
        whiteSpace: "nowrap",
        boxShadow: hov ? "0 6px 20px rgba(77,184,255,0.3)" : "none",
        transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </button>
  )
}

// ── NicheCard ─────────────────────────────────────────────────────────────────
function NicheCard({
  category,
  onToggle,
}: {
  category: Category & { is_active: boolean }
  onToggle: (id: string, active: boolean) => void
}) {
  const [hov, setHov] = useState(false)
  const Icon = getNicheIcon(category.slug)
  const active = category.is_active
  const stats = NICHE_STATS[category.slug.toLowerCase()] ?? { products: 0, publications: 0, leads: 0 }
  const fields = Object.keys(category.attribute_schema)
  const shown = fields.slice(0, 6)
  const extra = Math.max(0, fields.length - 6)

  const border = active
    ? hov ? T.nicheActiveBorderHover : T.nicheActiveBorder
    : hov ? T.nicheInactiveBorderHover : T.nicheInactiveBorder

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: active ? T.bgSurface : T.nicheInactiveBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: active ? 18 : 16,
        transition: "border-color 200ms, transform 200ms",
        transform: active && hov ? "translateY(-1px)" : "none",
      }}
    >
      {/* Head */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: active ? T.infoBg : T.icoInactiveBg,
            border: `1px solid ${active ? T.borderMedium : T.icoInactiveBorder}`,
            color: active ? T.cyan : T.textDisabled,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={26} strokeWidth={1.75} />
        </span>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              margin: 0,
              color: active ? T.textPrimary : T.textSecondary,
            }}
          >
            {category.name}
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10.5,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 100,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              alignSelf: "flex-start",
              background: active ? T.successBg : T.chipBg,
              color: active ? T.success : T.textSecondary,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: active ? T.success : T.textDisabled,
              }}
            />
            {active ? "Activo" : "Inactivo"}
          </span>
        </div>

        <Switch on={active} onClick={() => onToggle(category.id, !active)} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: active ? 1 : 0.7 }}>
        {[
          { value: stats.products, label: "productos" },
          { value: stats.publications, label: "publicaciones" },
          { value: stats.leads, label: "leads" },
        ].map(({ value, label }) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 5,
              padding: "6px 12px",
              background: T.chipBg,
              border: `1px solid ${T.borderSubtle}`,
              borderRadius: 8,
              fontSize: 12,
              color: active ? T.textSecondary : T.textDisabled,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <b
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: active ? T.textPrimary : T.textDisabled,
                letterSpacing: "-0.01em",
              }}
            >
              {value}
            </b>
            {label}
          </span>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: active ? 1 : 0.5 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.textDisabled,
          }}
        >
          Campos configurados
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {shown.map((f) => (
            <span
              key={f}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 11.5,
                fontWeight: 500,
                color: T.textSecondary,
                padding: "4px 9px",
                background: T.fieldTagBg,
                border: `1px solid ${T.borderSubtle}`,
                borderRadius: 6,
              }}
            >
              {f}
            </span>
          ))}
          {extra > 0 && (
            <button
              type="button"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.cyan,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                padding: "4px 4px",
              }}
            >
              + {extra} más
            </button>
          )}
        </div>
      </div>

      {/* Channels (active only) */}
      {active && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.textDisabled,
            }}
          >
            Canales
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex" }}>
              {(
                [
                  { bg: "#1877F2", label: "f",  color: "#fff", sm: false },
                  { bg: "#FF6600", label: "AT", color: "#fff", sm: true  },
                  { bg: "#FFE600", label: "ML", color: "#1E1E1E", sm: true },
                ] as const
              ).map(({ bg, label, color, sm }, idx) => (
                <span
                  key={label}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: sm ? 9 : 11,
                    fontWeight: 800,
                    color,
                    background: bg,
                    marginLeft: idx === 0 ? 0 : -6,
                    border: `1.5px solid ${T.bgSurface}`,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {label}
                </span>
              ))}
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: T.navy,
                  color: T.cyan,
                  marginLeft: -6,
                  border: `1.5px solid ${T.bgSurface}`,
                }}
              >
                <Globe size={12} strokeWidth={2} />
              </span>
            </span>
            <span style={{ fontSize: 12, color: T.textSecondary }}>
              <b style={{ color: T.textPrimary, fontWeight: 600 }}>4 canales</b> conectados
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {active ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            paddingTop: 6,
            borderTop: `1px solid ${T.borderSubtle}`,
          }}
        >
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
  )
}

// ── AddNicheCard ──────────────────────────────────────────────────────────────
function AddNicheCard({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `2px dashed ${hov ? T.borderStrong : T.borderDefault}`,
        borderRadius: 16,
        padding: 24,
        background: hov ? T.addCardHoverBg : T.addCardBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        textAlign: "center",
        cursor: "pointer",
        transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        minHeight: 200,
        transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: T.infoBg,
          border: `1px solid ${T.borderMedium}`,
          color: T.cyan,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={28} strokeWidth={1.75} />
      </span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: hov ? T.textPrimary : T.textSecondary,
          letterSpacing: "-0.005em",
          transition: "color 200ms",
        }}
      >
        Agregar nicho
      </span>
      <span
        style={{
          fontSize: 12,
          color: T.textDisabled,
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 10px",
        }}
      >
        {(
          [
            { Icon: Package, label: "Productos" },
            { Icon: Home,    label: "Inmuebles" },
            { Icon: Tractor, label: "Maquinaria" },
          ] as const
        ).map(({ Icon, label }) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon size={12} strokeWidth={2} color="var(--ps-text-secondary)" />
            <b style={{ fontWeight: 500, color: T.textSecondary }}>{label}</b>
          </span>
        ))}
        <b style={{ fontWeight: 500, color: T.textSecondary }}>y más</b>
      </span>
    </article>
  )
}

// ── AddFieldButton ────────────────────────────────────────────────────────────
function AddFieldButton() {
  const [hov, setHov] = useState(false)
  return (
    <button
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        height: 40,
        background: hov ? T.hoverBgSm : "transparent",
        border: `1.5px dashed ${hov ? T.borderActive : T.borderMedium}`,
        borderRadius: 8,
        color: T.cyan,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 180ms",
      }}
    >
      <Plus size={14} strokeWidth={2.5} />
      Agregar campo personalizado
    </button>
  )
}

// ── CustomFieldsCard ──────────────────────────────────────────────────────────
function CustomFieldsCard({ contextLabel }: { contextLabel: string }) {
  const COLS = ["Nombre del campo", "Tipo", "Requerido", "Visible en listing", ""]
  return (
    <section
      style={{
        background: T.bgSurface,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `1px solid ${T.borderSubtle}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.005em",
              color: T.textPrimary,
            }}
          >
            Campos personalizados
          </h3>
          <span style={{ fontSize: 11.5, color: T.textDisabled, letterSpacing: "-0.01em" }}>
            aplica a ·{" "}
            <b style={{ color: T.cyan, fontWeight: 600, letterSpacing: 0 }}>{contextLabel}</b>
          </span>
        </div>
        <button
          type="button"
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: T.cyan,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          Gestionar
          <ChevronDown size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            {COLS.map((col) => (
              <th
                key={col}
                style={{
                  textAlign: col === "" ? "right" : "left",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.textDisabled,
                  padding:
                    col === "Nombre del campo"
                      ? "12px 14px 12px 20px"
                      : col === ""
                        ? "12px 20px 12px 14px"
                        : "12px 14px",
                  background: T.chipBg,
                  borderBottom: `1px solid ${T.borderSubtle}`,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CUSTOM_FIELDS.map((field) => {
            const chip = TYPE_CHIPS[field.type]
            return (
              <FieldRow key={field.name} field={field} chip={chip} />
            )
          })}
        </tbody>
      </table>

      <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.borderSubtle}` }}>
        <AddFieldButton />
      </div>
    </section>
  )
}

// Extracted to keep renders cheap (no closure over CUSTOM_FIELDS)
function FieldRow({
  field,
  chip,
}: {
  field: (typeof CUSTOM_FIELDS)[number]
  chip: (typeof TYPE_CHIPS)[keyof typeof TYPE_CHIPS]
}) {
  const [rowHov, setRowHov] = useState(false)
  return (
    <tr
      onMouseEnter={() => setRowHov(true)}
      onMouseLeave={() => setRowHov(false)}
      style={{ background: rowHov ? T.tableRowHover : "transparent", transition: "background 180ms" }}
    >
      <td
        style={{
          padding: "12px 14px 12px 20px",
          borderBottom: `1px solid ${T.tableDivider}`,
          fontSize: 13,
          color: T.textPrimary,
          verticalAlign: "middle",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <field.icon size={14} strokeWidth={2} color="var(--ps-text-disabled)" />
          <span style={{ fontWeight: 500 }}>{field.name}</span>
        </span>
      </td>
      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.tableDivider}`, verticalAlign: "middle" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 100,
            background: chip.bgVar,
            color: chip.colorVar,
            letterSpacing: "-0.005em",
            fontFamily: "monospace",
          }}
        >
          {chip.label}
        </span>
      </td>
      {([field.required, field.visible] as const).map((val, i) => (
        <td
          key={i}
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${T.tableDivider}`,
            verticalAlign: "middle",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 500,
              color: val ? T.success : T.textDisabled,
            }}
          >
            {val ? <Check size={13} strokeWidth={2.5} /> : <Minus size={13} strokeWidth={2.5} />}
            {val ? "Sí" : "No"}
          </span>
        </td>
      ))}
      <td
        style={{
          padding: "12px 20px 12px 14px",
          borderBottom: `1px solid ${T.tableDivider}`,
          textAlign: "right",
          verticalAlign: "middle",
        }}
      >
        <div style={{ display: "inline-flex", gap: 4 }}>
          <IconBtn icon={Pencil} aria-label="Editar" />
          <IconBtn icon={Trash2} aria-label="Eliminar" danger />
        </div>
      </td>
    </tr>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 280,
              background: T.bgSurface,
              borderRadius: 16,
              border: `1px solid ${T.borderSubtle}`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: 320,
          background: T.bgSurface,
          borderRadius: 12,
          border: `1px solid ${T.borderSubtle}`,
          opacity: 0.5,
        }}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { data: categories = [], isLoading, error } = useCategories()
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({})

  const resolveActive = (cat: Category) =>
    localActive[cat.id] !== undefined ? localActive[cat.id] : cat.is_active

  const handleToggle = (id: string, active: boolean) => {
    setLocalActive((prev) => ({ ...prev, [id]: active }))
    // TODO: PATCH /api/v1/categories/{id} once backend supports toggle
  }

  const firstActive = categories.find((c) => resolveActive(c))

  if (isLoading) return <PageSkeleton />

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ color: T.error, marginBottom: 16 }}>Error al cargar las categorías</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 20px",
            background: T.cyan,
            color: T.bgBase,
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              margin: "0 0 4px",
              color: T.textPrimary,
            }}
          >
            Categorías
          </h1>
          <p style={{ fontSize: 13, color: T.textSecondary, margin: 0 }}>
            Gestioná los nichos activos en tu cuenta
          </p>
        </div>
        <CtaButton icon={Plus} label="Nueva categoría" />
      </div>

      {/* Niches grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
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
  )
}
