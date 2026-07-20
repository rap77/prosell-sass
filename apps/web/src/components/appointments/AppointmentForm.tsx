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
    user_id: z.string().min(1, { message: "La sucursal es requerida" }),
    date: z.string().min(1, { message: "La fecha es requerida" }),
    time: z.string().min(1, { message: "El horario es requerido" }),
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

  const errorStyle: React.CSSProperties = {
    color: "var(--ps-error)",
  };

  const hintStyle: React.CSSProperties = {
    color: "var(--ps-text-tertiary)",
  };

  if (!open) return null;

  return (
    <>
      <style>{FORM_STYLES}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agendar turno"
        onClick={(e) => e.stopPropagation()}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--ps-bg-surface)",
          borderColor: "var(--ps-border-default)",
          boxShadow: "0 24px 48px rgba(6,13,36,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{
            borderColor: "var(--ps-border-default)",
          }}
        >
          <div>
            <h2
              className="m-0 text-base font-bold tracking-tight"
              style={{
                color: "var(--ps-text-primary)",
              }}
            >
              Agendar turno
            </h2>
            <p
              className="mt-0.5 text-xs"
              style={{
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
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-opacity-10 transition-colors"
            style={{
              color: "var(--ps-text-secondary)",
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {/* A4.33: Banner de error */}
          {submitError && (
            <div
              data-testid="appointment-error-banner"
              className="flex items-start gap-3 p-3.5 rounded-md mb-4 border"
              style={{
                borderColor:
                  submitError.type === "conflict"
                    ? "var(--ps-error)"
                    : "var(--ps-warning)",
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
                  className="flex-shrink-0 mt-px"
                  style={{
                    color: "var(--ps-error)",
                  }}
                />
              ) : (
                <AlertTriangle
                  size={16}
                  strokeWidth={2}
                  className="flex-shrink-0 mt-px"
                  style={{
                    color: "var(--ps-warning)",
                  }}
                />
              )}
              <div className="flex-1">
                <p
                  className="m-0 text-sm font-semibold"
                  style={{
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
                  className="mt-1 text-xs"
                  style={{
                    color: "var(--ps-text-secondary)",
                  }}
                >
                  {submitError.message}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{
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
                className="bg-none border-none cursor-pointer text-lg leading-none"
                style={{
                  color: "var(--ps-text-secondary)",
                  padding: "2px",
                }}
              >
                ×
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            id="appointment-form"
            className="flex flex-col gap-4"
          >
            {/* Sucursal */}
            <div>
              <label
                htmlFor="user_id"
                className="block text-xs font-medium mb-1.5"
              >
                <span style={{ color: "var(--ps-text-primary)" }}>
                  Sucursal
                </span>{" "}
                <span style={{ color: "var(--ps-error)" }}>*</span>
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
              <label
                htmlFor="date"
                className="block text-xs font-medium mb-1.5"
              >
                <span style={{ color: "var(--ps-text-primary)" }}>Fecha</span>{" "}
                <span style={{ color: "var(--ps-error)" }}>*</span>
              </label>
              <input
                id="date"
                type="date"
                min={today}
                {...register("date")}
                className={`ps-apt-input${errors.date ? " ps-apt-input--error" : ""}`}
              />
              <p className="mt-1 text-xs" style={hintStyle}>
                Sólo días hábiles: lunes a viernes
              </p>
              {errors.date && (
                <p className="mt-1 text-xs" style={errorStyle}>
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Horario */}
            <div>
              <label
                htmlFor="time"
                className="block text-xs font-medium mb-1.5"
              >
                <span style={{ color: "var(--ps-text-primary)" }}>Horario</span>{" "}
                <span style={{ color: "var(--ps-error)" }}>*</span>
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
              <p className="mt-1 text-xs" style={hintStyle}>
                Horario de atención: 9:00 – 18:00
              </p>
              {errors.time && (
                <p className="mt-1 text-xs" style={errorStyle}>
                  {errors.time.message}
                </p>
              )}
            </div>

            {/* Notas */}
            <div>
              <label
                htmlFor="notes"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--ps-text-primary)" }}
              >
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
          className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t flex-shrink-0"
          style={{
            borderColor: "var(--ps-border-default)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="h-9 px-4 rounded text-xs font-medium cursor-pointer transition-opacity border"
            style={{
              background: "var(--ps-bg-elevated)",
              borderColor: "var(--ps-border-default)",
              color: "var(--ps-text-secondary)",
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="appointment-form"
            disabled={isCreating}
            className="inline-flex items-center gap-2 h-9 px-4.5 rounded text-xs font-bold cursor-pointer transition-opacity border-none"
            style={{
              background: "var(--ps-cyan)",
              color: "var(--ps-bg-base)",
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
