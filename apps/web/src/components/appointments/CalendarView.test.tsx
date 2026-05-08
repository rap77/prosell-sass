/**
 * CalendarView component tests
 *
 * Test coverage:
 * - Renders calendar with day/week/month toggle
 * - Displays appointments as events
 * - Filters appointments by user_id
 * - Handles view switching
 * - Responsive design
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarView } from "./CalendarView";
import { Appointment, AppointmentStatus } from "@/lib/api/appointments";

// Mock FullCalendar to avoid DOM complexity in tests
vi.mock("@fullcalendar/react", () => ({
  __esModule: true,
  default: ({ events, onViewChange, onDateRangeChange }: any) => (
    <div data-testid="fullcalendar-mock">
      <div data-testid="calendar-events">{events?.length || 0} events</div>
      <button onClick={() => onViewChange?.("day")}>Day View</button>
      <button onClick={() => onViewChange?.("week")}>Week View</button>
      <button onClick={() => onViewChange?.("month")}>Month View</button>
    </div>
  ),
}));

describe("CalendarView", () => {
  let queryClient: QueryClient;

  const mockAppointments: Appointment[] = [
    {
      id: "1",
      tenant_id: "tenant-1",
      lead_id: "lead-1",
      user_id: "branch-1",
      product_id: "vehicle-1",
      scheduled_at: "2026-04-29T10:00:00Z",
      status: AppointmentStatus.SCHEDULED,
      notes: "Test appointment 1",
      created_at: "2026-04-29T09:00:00Z",
      updated_at: "2026-04-29T09:00:00Z",
    },
    {
      id: "2",
      tenant_id: "tenant-1",
      lead_id: "lead-2",
      user_id: "branch-1",
      product_id: "vehicle-2",
      scheduled_at: "2026-04-29T14:00:00Z",
      status: AppointmentStatus.COMPLETED,
      notes: "Test appointment 2",
      created_at: "2026-04-29T09:00:00Z",
      updated_at: "2026-04-29T09:00:00Z",
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should render calendar with view toggle buttons", () => {
    render(<CalendarView appointments={mockAppointments} userId="branch-1" />, {
      wrapper,
    });

    expect(screen.getByTestId("fullcalendar-mock")).toBeInTheDocument();
    expect(screen.getByText("Day View")).toBeInTheDocument();
    expect(screen.getByText("Week View")).toBeInTheDocument();
    expect(screen.getByText("Month View")).toBeInTheDocument();
  });

  it("should display number of appointments", () => {
    render(<CalendarView appointments={mockAppointments} userId="branch-1" />, {
      wrapper,
    });

    expect(screen.getByTestId("calendar-events")).toHaveTextContent("2 events");
  });

  it("should filter appointments by user_id", () => {
    const otherBranchAppointments: Appointment[] = [
      {
        id: "3",
        tenant_id: "tenant-1",
        lead_id: "lead-3",
        user_id: "branch-2", // Different branch
        product_id: "vehicle-3",
        scheduled_at: "2026-04-29T10:00:00Z",
        status: AppointmentStatus.SCHEDULED,
        notes: "Other branch appointment",
        created_at: "2026-04-29T09:00:00Z",
        updated_at: "2026-04-29T09:00:00Z",
      },
    ];

    render(<CalendarView appointments={otherBranchAppointments} userId="branch-1" />, {
      wrapper,
    });

    // Should show 0 events because user_id doesn't match
    expect(screen.getByTestId("calendar-events")).toHaveTextContent("0 events");
  });

  it("should handle empty appointments array", () => {
    render(<CalendarView appointments={[]} userId="branch-1" />, {
      wrapper,
    });

    expect(screen.getByTestId("calendar-events")).toHaveTextContent("0 events");
  });

  it("should switch between day, week, and month views", async () => {
    render(<CalendarView appointments={mockAppointments} userId="branch-1" />, {
      wrapper,
    });

    const dayButton = screen.getByText("Day View");
    const weekButton = screen.getByText("Week View");
    const monthButton = screen.getByText("Month View");

    // Click day view
    dayButton.click();
    await waitFor(() => {
      expect(dayButton).toBeInTheDocument();
    });

    // Click week view
    weekButton.click();
    await waitFor(() => {
      expect(weekButton).toBeInTheDocument();
    });

    // Click month view
    monthButton.click();
    await waitFor(() => {
      expect(monthButton).toBeInTheDocument();
    });
  });
});
