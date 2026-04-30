import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DealerAppointmentsPage from "./page";
import * as appointmentsApi from "@/lib/api/appointments";
import * as authStoreModule from "@/stores/authStore";
import * as CalendarViewModule from "@/components/appointments/CalendarView";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/lib/api/appointments", () => ({
  useAppointments: vi.fn(),
  AppointmentStatus: {
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
}));

vi.mock("@/components/appointments/CalendarView", () => ({
  CalendarView: vi.fn(({ appointments, onAppointmentClick, dealerId }) => (
    <div data-testid="calendar-view">
      <div data-testid="dealer-id">{dealerId}</div>
      <div data-testid="appointment-count">{appointments.length}</div>
      {appointments.map((apt: any) => (
        <div key={apt.id} data-testid={`appointment-${apt.id}`}>
          {apt.scheduled_at}
        </div>
      ))}
      <button
        onClick={() => onAppointmentClick?.(appointments[0])}
        data-testid="click-appointment"
      >
        Click Appointment
      </button>
    </div>
  )),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

describe("DealerAppointmentsPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-1",
    email: "dealer@prosell.com",
    first_name: "John",
    last_name: "Dealer",
    role: "dealer",
  };

  const mockAppointments = [
    {
      id: "apt-1",
      tenant_id: "tenant-1",
      lead_id: "lead-1",
      dealer_id: "dealer-1",
      vehicle_id: "vehicle-1",
      scheduled_at: "2026-04-30T10:00:00Z",
      status: "scheduled",
      notes: null,
      created_at: "2026-04-29T10:00:00Z",
      updated_at: "2026-04-29T10:00:00Z",
    },
    {
      id: "apt-2",
      tenant_id: "tenant-1",
      lead_id: "lead-2",
      dealer_id: "dealer-1",
      vehicle_id: "vehicle-2",
      scheduled_at: "2026-04-30T14:00:00Z",
      status: "completed",
      notes: "Test note",
      created_at: "2026-04-29T10:00:00Z",
      updated_at: "2026-04-29T10:00:00Z",
    },
  ];

  it("should render page header with title and description", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your appointments and schedule")
    ).toBeInTheDocument();
  });

  it("should render calendar view with dealer appointments", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("appointment-count")).toHaveTextContent("2");
  });

  it("should show today's appointments count badge", async () => {
    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = [
      {
        ...mockAppointments[0],
        scheduled_at: `${today}T10:00:00Z`,
      },
      {
        ...mockAppointments[1],
        scheduled_at: `${today}T14:00:00Z`,
      },
    ];

    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: todayAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("today-badge")).toBeInTheDocument();
    });

    expect(screen.getByTestId("today-badge")).toHaveTextContent("2");
  });

  it("should handle loading state", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("calendar-loading")).toBeInTheDocument();
  });

  it("should handle error state", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load appointments"),
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    expect(
      screen.getByText((content) => content.includes("Error loading appointments"))
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("should handle appointment click", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({ user: mockUser } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("click-appointment")).toBeInTheDocument();
    });

    // Click on an appointment
    const clickButton = screen.getByTestId("click-appointment");
    clickButton.click();

    // Should set selected appointment (details modal would be shown in A6.10)
    await waitFor(() => {
      expect(screen.getByTestId("selected-appointment")).toBeInTheDocument();
    });
  });

  it("should filter appointments by dealer_id", async () => {
    const dealerId = "dealer-1";
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: { ...mockUser, id: dealerId },
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <DealerAppointmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    // Verify useAppointments was called with dealer_id filter
    expect(appointmentsApi.useAppointments).toHaveBeenCalledWith(
      { dealer_id: dealerId },
      50,
      0
    );
  });
});
