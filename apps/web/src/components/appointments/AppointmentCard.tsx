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

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; style: React.CSSProperties }
> = {
  [AppointmentStatus.SCHEDULED]: {
    label: "Agendado",
    style: {
      background: "var(--ps-info-bg)",
      color: "var(--ps-cyan)",
      border: "1px solid rgba(77,184,255,0.25)",
    },
  },
  [AppointmentStatus.COMPLETED]: {
    label: "Completado",
    style: {
      background: "var(--ps-success-bg)",
      color: "var(--ps-success)",
      border: "1px solid var(--ps-success)",
    },
  },
  [AppointmentStatus.CANCELLED]: {
    label: "Cancelado",
    style: {
      background: "var(--ps-error-bg)",
      color: "var(--ps-error)",
      border: "1px solid var(--ps-error)",
    },
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

  const iconStyle: React.CSSProperties = {
    color: "var(--ps-text-tertiary)",
    flexShrink: 0,
  };

  return (
    <div
      data-testid="appointment-card"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-[10px] border border-[var(--ps-border-default)] bg-[var(--ps-bg-surface)] p-4 transition-shadow duration-150"
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
          <Calendar size={14} strokeWidth={2} style={iconStyle} />
          <span className="text-xs text-[var(--ps-text-secondary)]">
            {format(scheduledDate, "d MMM yyyy")}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide"
          style={statusConfig.style}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Comprador */}
      <div className="mb-2 flex items-center gap-2">
        <User size={14} strokeWidth={2} style={iconStyle} />
        <span className="text-xs font-semibold text-[var(--ps-text-primary)]">
          {lead.buyer_name}
        </span>
      </div>

      {/* Vehículo */}
      <div className="mb-2 flex items-center gap-2">
        <Car size={14} strokeWidth={2} style={iconStyle} />
        {lead.product ? (
          <span className="text-xs text-[var(--ps-text-secondary)]">
            {lead.product.attributes.year} {lead.product.attributes.make}{" "}
            {lead.product.attributes.model}
          </span>
        ) : (
          <span className="text-xs italic text-[var(--ps-text-tertiary)]">
            Vehículo no disponible
          </span>
        )}
      </div>

      {/* Hora */}
      <div className="flex items-center gap-2">
        <Clock size={14} strokeWidth={2} style={iconStyle} />
        <span className="text-xs text-[var(--ps-text-secondary)]">
          {format(scheduledDate, "HH:mm")}
        </span>
      </div>

      {/* Notas */}
      {appointment.notes && (
        <div className="mt-3 border-t border-[var(--ps-border-subtle)] pt-3">
          <p className="m-0 text-xs italic text-[var(--ps-text-secondary)]">
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Acciones (solo turnos agendados) */}
      {appointment.status === AppointmentStatus.SCHEDULED &&
        (onConfirm || onCancel) && (
          <div className="mt-3 flex gap-2 border-t border-[var(--ps-border-subtle)] pt-3">
            {onConfirm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="h-8 rounded-md border-none bg-[var(--ps-success)] px-3.5 text-xs font-semibold text-white"
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
                className="h-8 rounded-md border border-[var(--ps-error)] bg-transparent px-3.5 text-xs font-semibold text-[var(--ps-error)]"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
    </div>
  );
}
