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
      style={{
        background: "var(--ps-bg-surface)",
        border: "1px solid var(--ps-border-default)",
        borderRadius: 10,
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        boxShadow:
          isHovered && onClick
            ? "0 4px 16px rgba(6,13,36,0.25)"
            : "0 1px 4px rgba(6,13,36,0.1)",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Header: fecha + badge de estado */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={14} strokeWidth={2} style={iconStyle} />
          <span style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
            {format(scheduledDate, "d MMM yyyy")}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.04em",
            ...statusConfig.style,
          }}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Comprador */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <User size={14} strokeWidth={2} style={iconStyle} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ps-text-primary)",
          }}
        >
          {lead.buyer_name}
        </span>
      </div>

      {/* Vehículo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Car size={14} strokeWidth={2} style={iconStyle} />
        {lead.product ? (
          <span style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
            {lead.product.attributes.year} {lead.product.attributes.make}{" "}
            {lead.product.attributes.model}
          </span>
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "var(--ps-text-tertiary)",
              fontStyle: "italic",
            }}
          >
            Vehículo no disponible
          </span>
        )}
      </div>

      {/* Hora */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={14} strokeWidth={2} style={iconStyle} />
        <span style={{ fontSize: 13, color: "var(--ps-text-secondary)" }}>
          {format(scheduledDate, "HH:mm")}
        </span>
      </div>

      {/* Notas */}
      {appointment.notes && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--ps-border-subtle)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--ps-text-secondary)",
              fontStyle: "italic",
            }}
          >
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Acciones (solo turnos agendados) */}
      {appointment.status === AppointmentStatus.SCHEDULED &&
        (onConfirm || onCancel) && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--ps-border-subtle)",
              display: "flex",
              gap: 8,
            }}
          >
            {onConfirm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                style={{
                  height: 32,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: "var(--ps-success)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
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
                style={{
                  height: 32,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ps-error)",
                  background: "transparent",
                  border: "1px solid var(--ps-error)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
    </div>
  );
}
