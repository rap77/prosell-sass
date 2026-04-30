"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAppointments, Appointment } from "@/lib/api/appointments";
import { CalendarView } from "@/components/appointments/CalendarView";
import { AppointmentDetailsModal } from "@/components/appointments/AppointmentDetailsModal";
import { Calendar, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";

/**
 * Dealer Appointments Page
 *
 * Features:
 * - Display calendar with dealer's appointments
 * - Day/week/month views
 * - Filter appointments by dealer_id from user context
 * - Show today's appointments count badge
 * - Show appointment details modal on click
 * - Confirm/cancel appointments from modal
 * - Responsive design for mobile/desktop
 *
 * Route: /dealer/appointments
 * Role: Dealer
 */
export default function DealerAppointmentsPage() {
  const { user } = useAuthStore();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualRefetch, setIsManualRefetch] = useState(false);

  // Get dealer_id from user context
  // Note: In a real implementation, this would come from user_dealer assignment
  // For now, we use user.id as the dealer_id (simplified for MVP)
  const dealerId = user?.id || "";

  // Fetch appointments with dealer filter
  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useAppointments({ dealer_id: dealerId }, 50, 0);

  // Calculate today's appointments count
  const todayAppointmentsCount = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    return appointments.filter((apt) => {
      const scheduledDate = parseISO(apt.scheduled_at);
      return scheduledDate >= startOfToday && scheduledDate <= endOfToday;
    }).length;
  }, [appointments]);

  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsManualRefetch(true);
    await refetch();
    setTimeout(() => setIsManualRefetch(false), 500);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your appointments and schedule
          </p>
        </div>
        <div
          data-testid="calendar-loading"
          className="flex items-center justify-center py-12"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your appointments and schedule
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-500 mb-4">Error loading appointments: {error.message}</p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">
              Manage your appointments and schedule
            </p>
          </div>
          {/* Today's appointments badge */}
          {todayAppointmentsCount > 0 && (
            <div
              data-testid="today-badge"
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">
                {todayAppointmentsCount} today
              </span>
            </div>
          )}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          data-testid="refresh-button"
        >
          <RefreshCw
            className={`h-4 w-4 ${isManualRefetch ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CalendarView
          appointments={appointments}
          dealerId={dealerId}
          onAppointmentClick={handleAppointmentClick}
        />
      </div>

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedAppointment(null);
          }
        }}
      />
    </div>
  );
}
