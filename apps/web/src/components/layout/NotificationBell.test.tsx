/**
 * NotificationBell — CRM roadmap Fase 5 verification.
 *
 * The bell already renders any notification generically (title/body) and
 * already routes resource_type:"lead" clicks to /vendedor/leads/{id} —
 * this test PROVES (doesn't drive) that the new backend notification
 * type (lead_stale_no_activity, added for the stale-leads automation)
 * needs zero frontend changes to show up correctly, instead of just
 * asserting it from reading the code.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationBell } from "./NotificationBell";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
vi.mock("@/lib/api/notificationsApi", () => ({
  useNotifications: () => mockUseNotifications(),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({
    mutate: mockMarkAllRead,
    isPending: false,
  }),
}));

const STALE_LEAD_NOTIFICATION = {
  id: "notif-1",
  notification_type: "lead_stale_no_activity",
  title: "Lead sin seguimiento",
  body: "Juan Pérez no tiene actividad hace 3 días o más.",
  resource_type: "lead",
  resource_id: "lead-1",
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
};

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      data: { items: [STALE_LEAD_NOTIFICATION], unread_count: 1 },
      isLoading: false,
    });
  });

  it("renders a lead_stale_no_activity notification's title and body", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /notificaciones/i }));

    expect(screen.getByText("Lead sin seguimiento")).toBeInTheDocument();
    expect(
      screen.getByText("Juan Pérez no tiene actividad hace 3 días o más."),
    ).toBeInTheDocument();
  });

  it("marks it read and navigates to the lead on click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: /notificaciones/i }));
    await user.click(screen.getByText("Lead sin seguimiento"));

    expect(mockMarkRead).toHaveBeenCalledWith("notif-1");
    expect(mockPush).toHaveBeenCalledWith("/vendedor/leads/lead-1");
  });
});
