"use client";

/**
 * Settings › Notificaciones — ProSell notification preferences.
 * Toggle rows with Switch for granular notification config.
 */

import { useState } from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

export default function SettingsNotificationsPage() {
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_OPTIONS.map((o) => [o.id, o.defaultOn])),
  );

  const toggle = (id: string, value: boolean) =>
    setStates((prev) => ({ ...prev, [id]: value }));

  return (
    <div className="flex flex-col gap-6">
      {/* Section title */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Notificaciones
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Controlá qué eventos te generan alertas dentro de ProSell.
        </p>
      </div>

      <div className="h-px bg-ps-border-subtle" />

      {/* Toggle rows */}
      <div className="flex flex-col gap-2">
        {NOTIFICATION_OPTIONS.map((option) => {
          const isOn = states[option.id];
          return (
            <div
              key={option.id}
              className="flex items-start justify-between gap-6 p-4 rounded-[10px] border border-ps-border-subtle bg-ps-elevated"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors border",
                    isOn
                      ? "bg-ps-info-bg border-primary/20"
                      : "bg-card border-border",
                  )}
                >
                  <Bell
                    size={14}
                    strokeWidth={2}
                    className={cn(isOn ? "text-primary" : "text-ps-tertiary")}
                  />
                </div>

                {/* Text */}
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {option.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </div>

              <div className="pt-0.5 shrink-0">
                <Switch
                  checked={isOn}
                  onCheckedChange={(v) => toggle(option.id, v)}
                  aria-label={option.title}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder notice */}
      <p className="m-0 px-3.5 py-2.5 rounded-lg bg-ps-info-bg border border-primary/15 text-xs text-muted-foreground leading-relaxed">
        Las preferencias se guardan localmente por ahora. La integración con el
        backend de notificaciones estará disponible próximamente.
      </p>
    </div>
  );
}
