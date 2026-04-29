"use client";

import { useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { Appointment, AppointmentStatus } from "@/lib/api/appointments";
import { format, parseISO } from "date-fns";

/**
 * Calendar view types
 */
type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

/**
 * Status badge colors for appointments
 */
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: "#3b82f6", // blue-500
  [AppointmentStatus.COMPLETED]: "#22c55e", // green-500
  [AppointmentStatus.CANCELLED]: "#ef4444", // red-500
};

/**
 * Status badge labels
 */
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: "Scheduled",
  [AppointmentStatus.COMPLETED]: "Completed",
  [AppointmentStatus.CANCELLED]: "Cancelled",
};

interface CalendarViewProps {
  /** Appointments to display */
  appointments: Appointment[];
  /** Filter appointments by dealer ID */
  dealerId: string;
  /** Initial view to display */
  initialView?: CalendarView;
  /** Callback when appointment is clicked */
  onAppointmentClick?: (appointment: Appointment) => void;
  /** Callback when date range changes */
  onDateRangeChange?: (start: Date, end: Date) => void;
}

/**
 * CalendarView component - Display appointments in a calendar
 *
 * Features:
 * - Day/week/month/list views
 * - Filter appointments by dealer_id
 * - Color-coded status badges
 * - Responsive design
 * - Event click handling
 *
 * @example
 * ```tsx
 * <CalendarView
 *   appointments={appointments}
 *   dealerId="dealer-1"
 *   onAppointmentClick={(apt) => setSelectedAppointment(apt)}
 * />
 * ```
 */
export function CalendarView({
  appointments,
  dealerId,
  initialView = "dayGridMonth",
  onAppointmentClick,
  onDateRangeChange,
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>(initialView);

  /**
   * Transform appointments to FullCalendar event format
   * Filters by dealer_id and formats dates
   */
  const calendarEvents = useCallback(() => {
    return appointments
      .filter((apt) => apt.dealer_id === dealerId)
      .map((apt) => {
        const startDate = parseISO(apt.scheduled_at);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour

        return {
          id: apt.id,
          title: `${STATUS_LABELS[apt.status]} - ${format(startDate, "h:mm a")}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          backgroundColor: STATUS_COLORS[apt.status],
          borderColor: STATUS_COLORS[apt.status],
          extendedProps: {
            appointment: apt,
          },
        };
      });
  }, [appointments, dealerId]);

  /**
   * Handle view change
   */
  const handleViewChange = useCallback(
    (view: { type: CalendarView }) => {
      setCurrentView(view.type);
    },
    [setCurrentView]
  );

  /**
   * Handle event click
   */
  const handleEventClick = useCallback(
    (info: any) => {
      const appointment = info.event.extendedProps.appointment as Appointment;
      onAppointmentClick?.(appointment);
    },
    [onAppointmentClick]
  );

  /**
   * Handle date range change
   */
  const handleDatesSet = useCallback(
    (dateInfo: { start: Date; end: Date }) => {
      onDateRangeChange?.(dateInfo.start, dateInfo.end);
    },
    [onDateRangeChange]
  );

  return (
    <div className="calendar-view w-full">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView={currentView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        events={calendarEvents()}
        eventClick={handleEventClick}
        viewDidChange={handleViewChange}
        datesSet={handleDatesSet}
        height="auto"
        editable={false}
        selectable={false}
        nowIndicator
        dayMaxEvents={true} // Allow "more" link when too many events
        weekends={false} // Hide weekends (business hours only)
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
          startTime: "9:00",
          endTime: "18:00",
        }}
      />
    </div>
  );
}
