"use client";

import { useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
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
  [AppointmentStatus.CANCELLED]: "#dc2626", // red-600
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
  /** Filter appointments by branch ID */
  userId: string;
  /** Initial view to display */
  initialView?: CalendarView;
  /** Callback when appointment is clicked */
  onAppointmentClick?: (appointment: Appointment) => void;
  /** Callback when date range changes */
  onDateRangeChange?: (start: Date, end: Date) => void;
  /** Callback when empty slot is selected */
  onSlotSelect?: (start: Date, end: Date) => void;
  /** Callback when appointment is dropped (rescheduled) */
  onAppointmentDrop?: (appointment: Appointment, newStart: Date, newEnd: Date) => void;
  /** Enable drag and drop */
  editable?: boolean;
  /** Enable slot selection */
  selectable?: boolean;
}

/**
 * CalendarView component - Display appointments in a calendar
 *
 * Features:
 * - Day/week/month/list views
 * - Filter appointments by user_id
 * - Color-coded status badges
 * - Responsive design
 * - Event click handling
 *
 * @example
 * ```tsx
 * <CalendarView
 *   appointments={appointments}
 *   userId="branch-1"
 *   onAppointmentClick={(apt) => setSelectedAppointment(apt)}
 * />
 * ```
 */
export function CalendarView({
  appointments,
  userId,
  initialView = "dayGridMonth",
  onAppointmentClick,
  onDateRangeChange,
  onSlotSelect,
  onAppointmentDrop,
  editable = false,
  selectable = false,
}: CalendarViewProps) {
  /**
   * Transform appointments to FullCalendar event format
   * Filters by user_id and formats dates
   */
  const calendarEvents = useCallback(() => {
    return appointments
      .filter((apt) => apt.user_id === userId)
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
  }, [appointments, userId]);

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

  /**
   * Handle slot selection (click on empty time slot)
   */
  const handleSelect = useCallback(
    (selectInfo: any) => {
      onSlotSelect?.(selectInfo.start, selectInfo.end);
    },
    [onSlotSelect]
  );

  /**
   * Handle event drop (drag to reschedule)
   */
  const handleDrop = useCallback(
    (dropInfo: any) => {
      const appointment = dropInfo.event.extendedProps.appointment as Appointment;
      onAppointmentDrop?.(appointment, dropInfo.event.start, dropInfo.event.end);
    },
    [onAppointmentDrop]
  );

  console.log("[CalendarView] Rendering with", calendarEvents().length, "events");
  console.log("[CalendarView] Events:", calendarEvents());

  return (
    <div className="calendar-view w-full" data-testid="calendar-view">
      <div data-testid="fullcalendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={initialView}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          events={calendarEvents()}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventDrop={handleDrop}
          height="auto"
          editable={editable}
          selectable={selectable}
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
    </div>
  );
}
