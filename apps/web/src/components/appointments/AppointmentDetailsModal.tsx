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
import { Appointment, AppointmentStatus, useUpdateAppointmentStatus } from "@/lib/api/appointments";
import { useLead } from "@/lib/api/leads";
import { Calendar, Clock, User, Car, Mail, Phone, X } from "lucide-react";

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
      background: 'var(--ps-info-bg)',
      color: 'var(--ps-cyan)',
      border: '1px solid rgba(77,184,255,0.25)',
    },
  },
  [AppointmentStatus.COMPLETED]: {
    label: "Completado",
    style: {
      background: 'var(--ps-success-bg)',
      color: 'var(--ps-success)',
      border: '1px solid var(--ps-success)',
    },
  },
  [AppointmentStatus.CANCELLED]: {
    label: "Cancelado",
    style: {
      background: 'var(--ps-error-bg)',
      color: 'var(--ps-error)',
      border: '1px solid var(--ps-error)',
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
  const { data: lead, isLoading: isLoadingLead } = useLead(appointment?.lead_id || "");

  // Actualizar estado del turno (confirmar o cancelar)
  const handleStatusUpdate = (newStatus: AppointmentStatus) => {
    if (!appointment) return;

    updateStatusMutation.mutate(
      { appointmentId: appointment.id, new_status: newStatus },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!appointment || !open) return null;

  const statusInfo = STATUS_CONFIG[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);

  const iconStyle: React.CSSProperties = {
    color: 'var(--ps-text-disabled)',
    flexShrink: 0,
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }

  const textStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--ps-text-secondary)',
  }

  const isPending = updateStatusMutation.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del turno"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 420,
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          boxShadow: '0 24px 48px rgba(6,13,36,0.4)',
          zIndex: 50,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--ps-border-default)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-text-primary)', letterSpacing: '-0.01em' }}>
              Detalle del turno
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ps-text-secondary)' }}>
              Información y gestión del turno
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--ps-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>

          {isLoadingLead ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <span style={{ fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                Cargando datos del lead...
              </span>
            </div>
          ) : !lead ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <span style={{ fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                No se encontró información del lead
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Badge de estado */}
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 12px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  ...statusInfo.style,
                }}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Fecha y hora */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={rowStyle}>
                  <Calendar size={14} strokeWidth={2} style={iconStyle} />
                  <span style={textStyle}>{format(scheduledDate, "d 'de' MMMM yyyy")}</span>
                </div>
                <div style={rowStyle}>
                  <Clock size={14} strokeWidth={2} style={iconStyle} />
                  <span style={textStyle}>{format(scheduledDate, "HH:mm")}</span>
                </div>
              </div>

              {/* Comprador */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={rowStyle}>
                  <User size={14} strokeWidth={2} style={iconStyle} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
                    {lead.buyer_name ?? "Comprador no disponible"}
                  </span>
                </div>
                {lead.buyer_email && (
                  <div style={{ ...rowStyle, paddingLeft: 24 }}>
                    <Mail size={13} strokeWidth={2} style={iconStyle} />
                    <span style={textStyle}>{lead.buyer_email}</span>
                  </div>
                )}
                {lead.buyer_phone && (
                  <div style={{ ...rowStyle, paddingLeft: 24 }}>
                    <Phone size={13} strokeWidth={2} style={iconStyle} />
                    <span style={textStyle}>{lead.buyer_phone}</span>
                  </div>
                )}
              </div>

              {/* Vehículo */}
              {lead.product ? (
                <div style={rowStyle}>
                  <Car size={14} strokeWidth={2} style={iconStyle} />
                  <span style={textStyle}>
                    {lead.product.attributes.year} {lead.product.attributes.make} {lead.product.attributes.model}
                  </span>
                </div>
              ) : (
                <div style={rowStyle}>
                  <Car size={14} strokeWidth={2} style={iconStyle} />
                  <span style={{ fontSize: 13, color: 'var(--ps-text-disabled)', fontStyle: 'italic' }}>
                    Vehículo no disponible
                  </span>
                </div>
              )}

              {/* Notas */}
              {appointment.notes && (
                <div style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--ps-border-subtle)',
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ps-text-secondary)', fontStyle: 'italic' }}>
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Acciones — solo turnos agendados */}
              {appointment.status === AppointmentStatus.SCHEDULED && (
                <div style={{
                  display: 'flex',
                  gap: 10,
                  paddingTop: 12,
                  borderTop: '1px solid var(--ps-border-default)',
                }}>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(AppointmentStatus.COMPLETED)}
                    disabled={isPending}
                    data-testid="confirm-button"
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      background: 'var(--ps-success)',
                      border: 'none',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? "Actualizando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(AppointmentStatus.CANCELLED)}
                    disabled={isPending}
                    data-testid="cancel-button"
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      background: 'transparent',
                      border: '1px solid var(--ps-error)',
                      color: 'var(--ps-error)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
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
