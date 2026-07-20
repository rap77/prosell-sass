"use client";

/**
 * AppointmentDetailsModal — modal de detalle de turno en ProSell.
 *
 * Muestra información completa del turno: comprador, contacto, vehículo,
 * fecha/hora, estado y acciones (confirmar/cancelar).
 * Toda la lógica de negocio preservada exactamente.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { format, parseISO } from "date-fns";
import {
  Appointment,
  AppointmentStatus,
  useUpdateAppointmentStatus,
} from "@/lib/api/appointments";
import { useLead } from "@/lib/api/leads";
import { Calendar, Clock, User, Car, Mail, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface AppointmentDetailsModalProps {
  /** Turno a mostrar */
  appointment: Appointment | null;
  /** Si el modal está abierto */
  open: boolean;
  /** Handler de apertura/cierre */
  onOpenChange: (open: boolean) => void;
}

// ============================================
// COMPONENT
// ============================================

export function AppointmentDetailsModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsModalProps) {
  const updateStatusMutation = useUpdateAppointmentStatus();

  // Fetch del lead para obtener datos del comprador y vehículo
  const { data: lead, isLoading: isLoadingLead } = useLead(
    appointment?.lead_id || "",
  );

  // Actualizar estado del turno (confirmar o cancelar)
  const handleStatusUpdate = (newStatus: AppointmentStatus) => {
    if (!appointment) return;

    updateStatusMutation.mutate(
      { appointmentId: appointment.id, new_status: newStatus },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!appointment || !open) return null;

  const statusInfo = STATUS_CONFIG[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);

  const iconStyle: React.CSSProperties = {
    color: "var(--ps-text-tertiary)",
    flexShrink: 0,
  };

  const isPending = updateStatusMutation.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del turno"
        onClick={(e) => e.stopPropagation()}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] z-50 max-h-[85vh] flex flex-col overflow-hidden rounded-[14px] border border-ps-border-default bg-ps-bg-surface shadow-[0_24px_48px_rgba(6,13,36,0.4)]"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-ps-border-default px-5 py-4">

          <div>
            <h2 className="text-base font-bold text-ps-text-primary" style={{ letterSpacing: "-0.01em" }}>
              Detalle del turno
            </h2>
            <p className="mt-0.5 text-xs text-ps-text-secondary">
              Información y gestión del turno
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border-0 bg-transparent text-ps-text-secondary cursor-pointer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoadingLead ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-sm text-ps-text-secondary">
                Cargando datos del lead...
              </span>
            </div>
          ) : !lead ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-sm text-ps-text-secondary">
                No se encontró información del lead
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Badge de estado */}
              <div>
                <span
                  className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold"
                  style={{
                    letterSpacing: "0.04em",
                    ...statusInfo.style,
                  }}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Fecha y hora */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} strokeWidth={2} style={iconStyle} />
                  <span className="text-sm text-ps-text-secondary">
                    {format(scheduledDate, "d 'de' MMMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={14} strokeWidth={2} style={iconStyle} />
                  <span className="text-sm text-ps-text-secondary">
                    {format(scheduledDate, "HH:mm")}
                  </span>
                </div>
              </div>

              {/* Comprador */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <User size={14} strokeWidth={2} style={iconStyle} />
                  <span className="text-sm font-semibold text-ps-text-primary">
                    {lead.buyer_name ?? "Comprador no disponible"}
                  </span>
                </div>
                {lead.buyer_email && (
                  <div className="flex items-center gap-2.5 pl-6">
                    <Mail size={13} strokeWidth={2} style={iconStyle} />
                    <span className="text-sm text-ps-text-secondary">{lead.buyer_email}</span>
                  </div>
                )}
                {lead.buyer_phone && (
                  <div className="flex items-center gap-2.5 pl-6">
                    <Phone size={13} strokeWidth={2} style={iconStyle} />
                    <span className="text-sm text-ps-text-secondary">{lead.buyer_phone}</span>
                  </div>
                )}
              </div>

              {/* Vehículo */}
              {lead.product ? (
                <div className="flex items-center gap-2.5">
                  <Car size={14} strokeWidth={2} style={iconStyle} />
                  <span className="text-sm text-ps-text-secondary">
                    {lead.product.attributes.year}{" "}
                    {lead.product.attributes.make}{" "}
                    {lead.product.attributes.model}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Car size={14} strokeWidth={2} style={iconStyle} />
                  <span className="text-sm italic text-ps-text-tertiary">
                    Vehículo no disponible
                  </span>
                </div>
              )}

              {/* Notas */}
              {appointment.notes && (
                <div className="border-t border-ps-border-subtle pt-3">
                  <p className="m-0 text-xs italic text-ps-text-secondary">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Acciones — solo turnos agendados */}
              {appointment.status === AppointmentStatus.SCHEDULED && (
                <div className="flex gap-2.5 border-t border-ps-border-default pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusUpdate(AppointmentStatus.COMPLETED)
                    }
                    disabled={isPending}
                    data-testid="confirm-button"
                    className="flex-1 h-9 rounded-lg border-0 bg-ps-success text-white text-sm font-bold cursor-pointer"
                    style={{
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? "Actualizando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusUpdate(AppointmentStatus.CANCELLED)
                    }
                    disabled={isPending}
                    data-testid="cancel-button"
                    className="flex-1 h-9 rounded-lg border border-ps-error bg-transparent text-ps-error text-sm font-semibold cursor-pointer"
                    style={{
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? "Actualizando..." : "Cancelar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
