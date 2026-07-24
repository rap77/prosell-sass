"use client";

/**
 * AppointmentCard — tarjeta de turno en ProSell.
 *
 * Muestra los detalles de un turno en formato card: comprador, vehículo,
 * fecha/hora, estado y acciones (confirmar/cancelar).
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Appointment, AppointmentStatus } from "@/lib/api/appointments";
import { Lead } from "@/lib/api/leads";
import { Calendar, Clock, User, Car } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// STATUS CONFIG
// ============================================

// ponytail: className strings instead of style objects (Tailwind 4 rule)
const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  [AppointmentStatus.SCHEDULED]: {
    label: "Agendado",
    className: "bg-ps-info-bg text-ps-cyan border border-ps-cyan/25",
  },
  [AppointmentStatus.COMPLETED]: {
    label: "Completado",
    className: "bg-ps-success-bg text-ps-success border border-ps-success",
  },
  [AppointmentStatus.CANCELLED]: {
    label: "Cancelado",
    className: "bg-ps-error-bg text-ps-error border border-ps-error",
  },
};

// ============================================
// TYPES
// ============================================

interface AppointmentCardProps {
  /** Datos del turno */
  appointment: Appointment;
  /** Datos del lead (incluye comprador y vehículo) */
  lead: Lead;
  /** Handler de click para abrir detalle */
  onClick?: () => void;
  /** Handler de confirmación (solo turnos agendados) */
  onConfirm?: () => void;
  /** Handler de cancelación (solo turnos agendados) */
  onCancel?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function AppointmentCard({
  appointment,
  lead,
  onClick,
  onConfirm,
  onCancel,
}: AppointmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const statusConfig = STATUS_CONFIG[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);

  // ponytail: icon className instead of style object
  const iconClass = "text-ps-text-tertiary shrink-0";

  return (
    <div
      data-testid="appointment-card"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-[10px] border border-ps-border-default bg-ps-surface p-4 transition-shadow duration-150"
      style={{
        cursor: onClick ? "pointer" : "default",
        boxShadow:
          isHovered && onClick
            ? "0 4px 16px rgba(6,13,36,0.25)"
            : "0 1px 4px rgba(6,13,36,0.1)",
      }}
    >
      {/* Header: fecha + badge de estado */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} strokeWidth={2} className={iconClass} />
          <span className="text-xs text-ps-text-secondary">
            {format(scheduledDate, "d MMM yyyy")}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
            statusConfig.className,
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Comprador */}
      <div className="mb-2 flex items-center gap-2">
        <User size={14} strokeWidth={2} className={iconClass} />
        <span className="text-xs font-semibold text-ps-text-primary">
          {lead.buyer_name}
        </span>
      </div>

      {/* Vehículo */}
      <div className="mb-2 flex items-center gap-2">
        <Car size={14} strokeWidth={2} className={iconClass} />
        {lead.product ? (
          <span className="text-xs text-ps-text-secondary">
            {lead.product.attributes.year} {lead.product.attributes.make}{" "}
            {lead.product.attributes.model}
          </span>
        ) : (
          <span className="text-xs italic text-ps-tertiary">
            Vehículo no disponible
          </span>
        )}
      </div>

      {/* Hora */}
      <div className="flex items-center gap-2">
        <Clock size={14} strokeWidth={2} className={iconClass} />
        <span className="text-xs text-ps-text-secondary">
          {format(scheduledDate, "HH:mm")}
        </span>
      </div>

      {/* Notas */}
      {appointment.notes && (
        <div className="mt-3 border-t border-ps-border-subtle pt-3">
          <p className="m-0 text-xs italic text-ps-text-secondary">
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Acciones (solo turnos agendados) */}
      {appointment.status === AppointmentStatus.SCHEDULED &&
        (onConfirm || onCancel) && (
          <div className="mt-3 flex gap-2 border-t border-ps-border-subtle pt-3">
            {onConfirm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="h-8 rounded-md border-none bg-ps-success px-3.5 text-xs font-semibold text-white"
              >
                Confirmar
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="h-8 rounded-md border border-ps-error bg-transparent px-3.5 text-xs font-semibold text-ps-error"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
    </div>
  );
}
