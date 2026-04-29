"use client";

import { format, parseISO } from "date-fns";
import { Appointment, AppointmentStatus } from "@/lib/api/appointments";
import { Lead } from "@/lib/api/leads";
import { Calendar, Clock, User, Car } from "lucide-react";

/**
 * Status badge configuration for appointments
 */
const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  [AppointmentStatus.SCHEDULED]: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  [AppointmentStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  [AppointmentStatus.CANCELLED]: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

interface AppointmentCardProps {
  /** Appointment data */
  appointment: Appointment;
  /** Lead data (includes buyer and vehicle info) */
  lead: Lead;
  /** Click handler */
  onClick?: () => void;
  /** Confirm handler (for scheduled appointments) */
  onConfirm?: () => void;
  /** Cancel handler (for scheduled appointments) */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AppointmentCard - Display appointment details in a card format
 *
 * Features:
 * - Buyer name and contact info
 * - Vehicle information (make, model, year)
 * - Formatted scheduled time
 * - Status badge with color coding
 * - Click interaction for details modal
 * - Responsive design
 *
 * @example
 * ```tsx
 * <AppointmentCard
 *   appointment={appointment}
 *   lead={lead}
 *   onClick={() => setSelectedAppointment(appointment)}
 * />
 * ```
 */
export function AppointmentCard({
  appointment,
  lead,
  onClick,
  onConfirm,
  onCancel,
  className = "",
}: AppointmentCardProps) {
  const statusConfig = STATUS_CONFIG[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);

  return (
    <div
      data-testid="appointment-card"
      onClick={onClick}
      className={`
        bg-white rounded-lg border border-gray-200 p-4
        hover:shadow-md transition-shadow cursor-pointer
        ${className}
      `}
    >
      {/* Header: Status badge and time */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {format(scheduledDate, "MMM d, yyyy")}
          </span>
        </div>
        <span
          className={`
            inline-flex items-center px-2.5 py-0.5
            rounded-full text-xs font-medium border
            ${statusConfig.className}
          `}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Buyer information */}
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">{lead.buyer_name}</span>
      </div>

      {/* Vehicle information */}
      {lead.vehicle ? (
        <div className="flex items-center gap-2 mb-2">
          <Car className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-2">
          <Car className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500 italic">
            Vehicle not available
          </span>
        </div>
      )}

      {/* Scheduled time */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {format(scheduledDate, "h:mm a")}
        </span>
      </div>

      {/* Notes (if present) */}
      {appointment.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 italic">{appointment.notes}</p>
        </div>
      )}

      {/* Action buttons (only for scheduled appointments) */}
      {appointment.status === AppointmentStatus.SCHEDULED &&
        (onConfirm || onCancel) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            {onConfirm && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className="
                  px-3 py-1.5 text-sm font-medium text-white
                  bg-green-600 hover:bg-green-700
                  rounded-md transition-colors
                "
              >
                Confirm
              </button>
            )}
            {onCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="
                  px-3 py-1.5 text-sm font-medium text-white
                  bg-red-600 hover:bg-red-700
                  rounded-md transition-colors
                "
              >
                Cancel
              </button>
            )}
          </div>
        )}
    </div>
  );
}
