"use client";

/**
 * Settings › Notificaciones — ProSell notification preferences.
 *
 * Placeholder initial view — toggle rows with Switch for future granular config.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { Bell } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const NOTIFICATION_OPTIONS = [
  {
    id: "lead-assigned",
    title: "Leads asignados",
    description: "Recibí avisos cuando un lead nuevo quede bajo tu gestión.",
    defaultOn: true,
  },
  {
    id: "appointment-reminders",
    title: "Recordatorios de citas",
    description: "Mostrá recordatorios previos a tus próximas citas.",
    defaultOn: true,
  },
  {
    id: "publication-status",
    title: "Estado de publicaciones",
    description:
      "Notificaciones cuando una publicación cambia de estado en Facebook Marketplace.",
    defaultOn: false,
  },
  {
    id: "pipeline-updates",
    title: "Movimientos en pipeline",
    description: "Alertas cuando un lead avanza o se pierde en el embudo.",
    defaultOn: false,
  },
];

// ─── Toggle switch (custom, no shadcn dependency) ─────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        width: 42,
        height: 24,
        borderRadius: 99,
        background: checked ? "var(--ps-cyan)" : "var(--ps-bg-elevated)",
        border: checked ? "none" : "1px solid var(--ps-border-medium)",
        cursor: "pointer",
        outline: "none",
        padding: 0,
        transition: "background 200ms, border 200ms",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: checked ? 20 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: checked ? "var(--ps-bg-base)" : "var(--ps-text-tertiary)",
          transition: "left 200ms, background 200ms",
        }}
      />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsNotificationsPage() {
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_OPTIONS.map((o) => [o.id, o.defaultOn])),
  );

  const toggle = (id: string, value: boolean) =>
    setStates((prev) => ({ ...prev, [id]: value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Section title */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          Notificaciones
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "var(--ps-text-secondary)",
          }}
        >
          Controlá qué eventos te generan alertas dentro de ProSell.
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--ps-border-subtle)" }} />

      {/* Toggle rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {NOTIFICATION_OPTIONS.map((option) => (
          <div
            key={option.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid var(--ps-border-subtle)",
              background: "var(--ps-bg-elevated)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: states[option.id]
                    ? "rgba(77,184,255,0.12)"
                    : "var(--ps-bg-surface)",
                  border: `1px solid ${states[option.id] ? "rgba(77,184,255,0.2)" : "var(--ps-border-default)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                  transition: "background 200ms, border 200ms",
                }}
              >
                <Bell
                  size={14}
                  strokeWidth={2}
                  style={{
                    color: states[option.id]
                      ? "var(--ps-cyan)"
                      : "var(--ps-text-tertiary)",
                  }}
                />
              </div>

              {/* Text */}
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ps-text-primary)",
                  }}
                >
                  {option.title}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 12,
                    color: "var(--ps-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {option.description}
                </p>
              </div>
            </div>

            <div style={{ paddingTop: 2, flexShrink: 0 }}>
              <Toggle
                checked={states[option.id]}
                onChange={(v) => toggle(option.id, v)}
                label={option.title}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder notice */}
      <p
        style={{
          margin: 0,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--ps-info-bg)",
          border: "1px solid rgba(77,184,255,0.15)",
          fontSize: 12,
          color: "var(--ps-text-secondary)",
          lineHeight: 1.5,
        }}
      >
        Las preferencias se guardan localmente por ahora. La integración con el
        backend de notificaciones estará disponible próximamente.
      </p>
    </div>
  );
}
