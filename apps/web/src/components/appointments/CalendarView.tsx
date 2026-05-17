"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, DatesSetArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
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
  const calendarEvents = appointments
    .filter((apt) => apt.user_id === userId)
    .map((apt) => {
      const startDate = parseISO(apt.scheduled_at);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

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

  const handleEventClick = (info: EventClickArg) => {
    const apt = info.event.extendedProps.appointment;
    if (apt && typeof apt === "object" && "id" in apt) {
      onAppointmentClick?.(apt as Appointment);
    }
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    onDateRangeChange?.(dateInfo.start, dateInfo.end);
  };

  const handleSelect = (selectInfo: DateSelectArg) => {
    onSlotSelect?.(selectInfo.start, selectInfo.end);
  };

  const handleDrop = (dropInfo: EventDropArg) => {
    const apt = dropInfo.event.extendedProps.appointment;
    if (apt && typeof apt === "object" && "id" in apt && dropInfo.event.start && dropInfo.event.end) {
      onAppointmentDrop?.(apt as Appointment, dropInfo.event.start, dropInfo.event.end);
    }
  };

  return (
    <div className="calendar-view w-full" data-testid="calendar-view">
      <div data-testid="fullcalendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          select={selectable ? handleSelect : undefined}
          eventDrop={editable ? handleDrop : undefined}
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
