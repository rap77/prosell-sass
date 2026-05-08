"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAppointments, Appointment } from "@/lib/api/appointments";
import { CalendarView } from "@/components/appointments/CalendarView";
import { AppointmentDetailsModal } from "@/components/appointments/AppointmentDetailsModal";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseISO, startOfDay, endOfDay } from "date-fns";

/**
 * Branch Appointments Page
 *
 * Features:
 * - Display calendar with branch's appointments
 * - Day/week/month views
 * - Filter appointments by user_id from user context
 * - Show today's appointments count badge
 * - Show appointment details modal on click
 * - Confirm/cancel appointments from modal
 * - Responsive design for mobile/desktop
 *
 * Route: /branch/appointments
 * Role: Branch
 */
export default function BranchAppointmentsPage() {
  const { user } = useAuthStore();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualRefetch, setIsManualRefetch] = useState(false);

  // Get user_id from user context
  // Note: In a real implementation, this would come from user_branch assignment
  // For now, we use user.id as the user_id (simplified for MVP)
  const userId = user?.id || "";

  // Fetch appointments with branch filter
  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useAppointments({ user_id: userId }, 50, 0);

  // Calculate today's appointments count
  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const todayAppointmentsCount = appointments.filter((apt) => {
    const scheduledDate = parseISO(apt.scheduled_at);
    return scheduledDate >= startOfToday && scheduledDate <= endOfToday;
  }).length;

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

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your appointments and schedule
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">Error loading appointments</p>
          <p className="mt-2 text-sm text-red-600">{error.message}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              void refetch();
            }}
          >
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
          userId={userId}
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
