"use client";

/**
 * AppointmentForm — modal para agendar turnos en ProSell.
 *
 * Features:
 * - Selector de fecha + horario (días hábiles, 9:00–18:00)
 * - Dropdown de sucursal
 * - Textarea de notas
 * - Validación de formulario + manejo de errores
 * - Toda la lógica de negocio preservada exactamente.
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useBranches } from "@/lib/api/branches";
import { useCreateAppointment } from "@/lib/api/appointments";
import { Loader2, AlertCircle, AlertTriangle, X } from "lucide-react";

// ============================================
// STYLES
// ============================================

const FORM_STYLES = `
  .ps-apt-input,
  .ps-apt-select,
  .ps-apt-textarea {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--ps-input-border);
    background: var(--ps-input-bg);
    color: var(--ps-text-primary);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .ps-apt-input:focus,
  .ps-apt-select:focus,
  .ps-apt-textarea:focus {
    border-color: var(--ps-cyan);
    box-shadow: var(--ps-input-focus-shadow);
  }
  .ps-apt-input::placeholder,
  .ps-apt-textarea::placeholder {
    color: var(--ps-text-tertiary);
  }
  .ps-apt-input--error {
    border-color: var(--ps-error);
  }
  .ps-apt-select option {
    background: var(--ps-bg-surface);
    color: var(--ps-text-primary);
  }
  .ps-apt-textarea {
    resize: none;
  }
`;

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si una fecha (string YYYY-MM-DD) cae en fin de semana.
 * Usa el constructor local de Date para evitar el desfase UTC-to-local.
 */
function isWeekend(dateString: string): boolean {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

// ============================================
// SCHEMA
// ============================================

/**
 * Validación del formulario con restricciones de horario:
 * - Días hábiles: lunes a viernes, 9:00–18:00
 * - Sin fines de semana
 */
const appointmentFormSchema = z
  .object({
    user_id: z.string().min(1, "La sucursal es requerida"),
    date: z.string().min(1, "La fecha es requerida"),
    time: z.string().min(1, "El horario es requerido"),
    notes: z.string().optional(),
  })
  .refine((data) => !isWeekend(data.date), {
    message: "No se pueden agendar turnos en fin de semana (sábado/domingo)",
    path: ["date"],
  });

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormError extends Error {
  status?: number;
}

// ============================================
// TYPES
// ============================================

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  vehicleId?: string | null;
}

// ============================================
// COMPONENT
// ============================================

export function AppointmentForm({
  open,
  onClose,
  onSuccess,
  leadId,
  vehicleId,
}: AppointmentFormProps) {
  const { data: branchesData, isLoading: branchesLoading } = useBranches();
  const branches = branchesData?.items || [];
  const { mutateAsync: createAppointment, isPending: isCreating } =
    useCreateAppointment();

  // Estado del error de submit (A4.33)
  const [submitError, setSubmitError] = useState<{
    type: "conflict" | "validation";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      user_id: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  // Resetear form y error cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset error state on modal close
      setSubmitError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      setSubmitError(null);

      // Combinar fecha y hora en string ISO
      const scheduledAt = new Date(`${data.date}T${data.time}`).toISOString();

      await createAppointment({
        lead_id: leadId,
        user_id: data.user_id,
        product_id: vehicleId || "",
        scheduled_at: scheduledAt,
        notes: data.notes || null,
      });

      onSuccess();
      onClose();
    } catch (error: unknown) {
      // A4.33: Mostrar warnings de conflicto y validación
      const appointmentError: AppointmentFormError =
        error instanceof Error ? error : new Error("Error desconocido");
      const status = appointmentError.status || 500;

      if (status === 409) {
        setSubmitError({
          type: "conflict",
          message:
            appointmentError.message ||
            "Esta sucursal ya tiene un turno en ese horario.",
        });
      } else if (status === 400) {
        setSubmitError({
          type: "validation",
          message: appointmentError.message || "Horario de turno inválido.",
        });
      } else {
        setSubmitError({
          type: "validation",
          message: "Error al agendar el turno. Intentá de nuevo.",
        });
      }
    }
  };

  // Horarios disponibles (días hábiles: 9:00–18:00)
  const timeSlots = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];

  const watchedUserId = useWatch({ control, name: "user_id" });
  const watchedTime = useWatch({ control, name: "time" });

  // Fecha mínima = hoy
  const today = format(new Date(), "yyyy-MM-dd");

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--ps-text-primary)",
    marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = {
    margin: "4px 0 0",
    fontSize: 11,
    color: "var(--ps-error)",
  };

  const hintStyle: React.CSSProperties = {
    margin: "4px 0 0",
    fontSize: 11,
    color: "var(--ps-text-tertiary)",
  };

  if (!open) return null;

  return (
    <>
      <style>{FORM_STYLES}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agendar turno"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 500,
          background: "var(--ps-bg-surface)",
          border: "1px solid var(--ps-border-default)",
          borderRadius: 14,
          boxShadow: "0 24px 48px rgba(6,13,36,0.4)",
          zIndex: 50,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid var(--ps-border-default)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ps-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Agendar turno
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "var(--ps-text-secondary)",
              }}
            >
              Seleccioná una sucursal y el horario preferido.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--ps-text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {/* A4.33: Banner de error */}
          {submitError && (
            <div
              data-testid="appointment-error-banner"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                borderRadius: 10,
                marginBottom: 16,
                border: `1px solid ${submitError.type === "conflict" ? "var(--ps-error)" : "var(--ps-warning)"}`,
                background:
                  submitError.type === "conflict"
                    ? "var(--ps-error-bg)"
                    : "var(--ps-warning-bg)",
              }}
            >
              {submitError.type === "conflict" ? (
                <AlertCircle
                  size={16}
                  strokeWidth={2}
                  style={{
                    color: "var(--ps-error)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
              ) : (
                <AlertTriangle
                  size={16}
                  strokeWidth={2}
                  style={{
                    color: "var(--ps-warning)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      submitError.type === "conflict"
                        ? "var(--ps-error)"
                        : "var(--ps-warning)",
                  }}
                >
                  {submitError.type === "conflict"
                    ? "Conflicto de horario"
                    : "Error de validación"}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  {submitError.message}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 11,
                    color: "var(--ps-text-tertiary)",
                  }}
                >
                  {submitError.type === "conflict"
                    ? "Elegí un horario o sucursal diferente."
                    : "Elegí un día hábil dentro del horario de atención (9:00 – 18:00)."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ps-text-secondary)",
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            id="appointment-form"
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Sucursal */}
            <div>
              <label htmlFor="user_id" style={labelStyle}>
                Sucursal <span style={{ color: "var(--ps-error)" }}>*</span>
              </label>
              <select
                id="user_id"
                value={watchedUserId}
                onChange={(e) => setValue("user_id", e.target.value)}
                disabled={branchesLoading}
                className="ps-apt-select"
              >
                <option value="">Seleccioná una sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {errors.user_id && (
                <p style={errorStyle}>{errors.user_id.message}</p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label htmlFor="date" style={labelStyle}>
                Fecha <span style={{ color: "var(--ps-error)" }}>*</span>
              </label>
              <input
                id="date"
                type="date"
                min={today}
                {...register("date")}
                className={`ps-apt-input${errors.date ? " ps-apt-input--error" : ""}`}
              />
              <p style={hintStyle}>Sólo días hábiles: lunes a viernes</p>
              {errors.date && <p style={errorStyle}>{errors.date.message}</p>}
            </div>

            {/* Horario */}
            <div>
              <label htmlFor="time" style={labelStyle}>
                Horario <span style={{ color: "var(--ps-error)" }}>*</span>
              </label>
              <select
                id="time"
                value={watchedTime}
                onChange={(e) => setValue("time", e.target.value)}
                className="ps-apt-select"
              >
                <option value="">Seleccioná un horario</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <p style={hintStyle}>Horario de atención: 9:00 – 18:00</p>
              {errors.time && <p style={errorStyle}>{errors.time.message}</p>}
            </div>

            {/* Notas */}
            <div>
              <label htmlFor="notes" style={labelStyle}>
                Notas
              </label>
              <textarea
                id="notes"
                placeholder="Agregar notas adicionales..."
                rows={3}
                {...register("notes")}
                className="ps-apt-textarea"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 24px",
            borderTop: "1px solid var(--ps-border-default)",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              background: "var(--ps-bg-elevated)",
              border: "1px solid var(--ps-border-default)",
              color: "var(--ps-text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="appointment-form"
            disabled={isCreating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 38,
              padding: "0 18px",
              borderRadius: 8,
              background: "var(--ps-cyan)",
              border: "none",
              color: "var(--ps-bg-base)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating && (
              <Loader2
                size={14}
                strokeWidth={2}
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            )}
            Agendar
          </button>
        </div>
      </div>
    </>
  );
}
