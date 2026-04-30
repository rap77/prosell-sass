"use client";

import { format, parseISO } from "date-fns";
import { Appointment, AppointmentStatus, useUpdateAppointmentStatus } from "@/lib/api/appointments";
import { useLead } from "@/lib/api/leads";
import { Calendar, Clock, User, Car, Mail, Phone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppointmentDetailsModalProps {
  /** Appointment to display */
  appointment: Appointment | null;
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onOpenChange: (open: boolean) => void;
}

/**
 * AppointmentDetailsModal - Show full appointment details in a modal
 *
 * Features:
 * - Buyer name and contact info (email, phone)
 * - Vehicle information (make, model, year)
 * - Formatted scheduled date and time
 * - Status badge with color coding
 * - Confirm/Cancel buttons for scheduled appointments
 * - Notes display
 * - Responsive design
 *
 * @example
 * ```tsx
 * <AppointmentDetailsModal
 *   appointment={selectedAppointment}
 *   open={isModalOpen}
 *   onOpenChange={setIsModalOpen}
 * />
 * ```
 */
export function AppointmentDetailsModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsModalProps) {
  const updateStatusMutation = useUpdateAppointmentStatus(appointment?.id || "");

  // Fetch lead details to get buyer and vehicle info
  const { data: lead, isLoading: isLoadingLead } = useLead(appointment?.lead_id || "");

  // Handle status update (confirm or cancel)
  const handleStatusUpdate = (newStatus: AppointmentStatus) => {
    if (!appointment) return;

    updateStatusMutation.mutate(
      { status: newStatus },
      {
        onSuccess: () => {
          // Close modal after successful update
          onOpenChange(false);
        },
      }
    );
  };

  // Close modal handler
  const handleClose = () => {
    onOpenChange(false);
  };

  if (!appointment) {
    return null;
  }

  const statusConfig: Record<
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

  const statusInfo = statusConfig[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>

        {isLoadingLead ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading lead details...</div>
          </div>
        ) : lead ? (
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span
                className={`
                  inline-flex items-center px-2.5 py-0.5
                  rounded-full text-xs font-medium border
                  ${statusInfo.className}
                `}
              >
                {statusInfo.label}
              </span>
            </div>

            {/* Date and time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {format(scheduledDate, "MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {format(scheduledDate, "h:mm a")}
                </span>
              </div>
            </div>

            {/* Buyer information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">{lead.buyer_name}</span>
              </div>
              {lead.buyer_email && (
                <div className="flex items-center gap-2 pl-6">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{lead.buyer_email}</span>
                </div>
              )}
              {lead.buyer_phone && (
                <div className="flex items-center gap-2 pl-6">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{lead.buyer_phone}</span>
                </div>
              )}
            </div>

            {/* Vehicle information */}
            {lead.vehicle ? (
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500 italic">
                  Vehicle not available
                </span>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 italic">{appointment.notes}</p>
              </div>
            )}

            {/* Action buttons (only for scheduled appointments) */}
            {appointment.status === AppointmentStatus.SCHEDULED && (
              <div className="pt-4 border-t border-gray-200 flex gap-2">
                <Button
                  onClick={() => handleStatusUpdate(AppointmentStatus.COMPLETED)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="confirm-button"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(AppointmentStatus.CANCELLED)}
                  disabled={updateStatusMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  data-testid="cancel-button"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Cancel"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Lead details not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
