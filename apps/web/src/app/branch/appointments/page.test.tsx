import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BranchAppointmentsPage from "./page";
import * as appointmentsApi from "@/lib/api/appointments";
import * as authStoreModule from "@/stores/authStore";
import * as CalendarViewModule from "@/components/appointments/CalendarView";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/lib/api/appointments", () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  AppointmentStatus: {
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },
}));

vi.mock("@/components/appointments/CalendarView", () => ({
  CalendarView: vi.fn(({ appointments, onAppointmentClick, userId }) => (
    <div data-testid="calendar-view">
      <div data-testid="branch-id">{userId}</div>
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

vi.mock("@/lib/api/leads", () => ({
  useLead: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  LeadStatus: {
    NEW: "new",
    CONTACTED: "contacted",
    QUALIFIED: "qualified",
    APPOINTMENT_SET: "appointment_set",
    LOST: "lost",
  },
}));

describe("BranchAppointmentsPage", () => {
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
    email: "branch@prosell.com",
    first_name: "John",
    last_name: "Branch",
    role: "branch",
  };

  const mockAppointments = [
    {
      id: "apt-1",
      tenant_id: "tenant-1",
      lead_id: "lead-1",
      user_id: "branch-1",
      product_id: "vehicle-1",
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
      user_id: "branch-1",
      product_id: "vehicle-2",
      scheduled_at: "2026-04-30T14:00:00Z",
      status: "completed",
      notes: "Test note",
      created_at: "2026-04-29T10:00:00Z",
      updated_at: "2026-04-29T10:00:00Z",
    },
  ];

  it("should render page header with title and description", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Citas")).toBeInTheDocument();
    expect(
      screen.getByText("Agenda y seguimiento de citas de la sucursal."),
    ).toBeInTheDocument();
  });

  it("should render calendar view with branch appointments", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    expect(screen.getByTestId("appointment-count")).toHaveTextContent("2");
  });

  it("should show today's appointments count badge", async () => {
    // Use local date (not UTC) to match component's startOfDay/endOfDay comparison
    const localDate = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`;
    const todayAppointments = [
      {
        ...mockAppointments[0],
        scheduled_at: `${today}T10:00:00`,
      },
      {
        ...mockAppointments[1],
        scheduled_at: `${today}T14:00:00`,
      },
    ];

    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: todayAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("today-badge")).toBeInTheDocument();
    });

    expect(screen.getByTestId("today-badge")).toHaveTextContent("2");
  });

  it("should handle loading state", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("calendar-loading")).toBeInTheDocument();
  });

  it("should handle error state", () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load appointments"),
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText((content) =>
        content.includes("Error al cargar las citas"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reintentar/i }),
    ).toBeInTheDocument();
  });

  it("should handle appointment click", async () => {
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: mockUser,
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("click-appointment")).toBeInTheDocument();
    });

    // Click on an appointment
    const clickButton = screen.getByTestId("click-appointment");
    clickButton.click();

    // Should show appointment details modal
    await waitFor(() => {
      expect(screen.getByText("Detalle del turno")).toBeInTheDocument();
    });
  });

  it("should filter appointments by user_id", async () => {
    const userId = "branch-1";
    vi.spyOn(authStoreModule, "useAuthStore").mockReturnValue({
      user: { ...mockUser, id: userId },
    } as any);
    vi.spyOn(appointmentsApi, "useAppointments").mockReturnValue({
      data: mockAppointments,
      isLoading: false,
      error: null,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <BranchAppointmentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    // Verify useAppointments was called with user_id filter
    expect(appointmentsApi.useAppointments).toHaveBeenCalledWith(
      { user_id: userId },
      50,
      0,
    );
  });
});
