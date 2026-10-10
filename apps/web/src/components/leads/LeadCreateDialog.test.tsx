/**
 * Unit tests for LeadCreateDialog component.
 *
 * Behavior under test: a self-contained trigger button ("Nuevo lead") opens
 * a dialog with the manual lead creation form; submitting requires buyer_name,
 * posts the CreateLeadRequest payload to POST /api/v1/leads, toasts success
 * and closes the dialog; validation and API failures keep the dialog open.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LeadCreateDialog } from "./LeadCreateDialog";
import { toast } from "sonner";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Minimal valid BackendLeadResponse for the POST /leads happy path
const createdLeadResponse = {
  id: "lead-new-1",
  tenant_id: "tenant-1",
  buyer_name: "Test Buyer",
  buyer_email: "buyer@test.com",
  buyer_phone: "+5491100000000",
  product_id: null,
  vendedor_id: "user-1",
  message: "Mensaje de prueba",
  source: "manual",
  status: "new",
  created_at: "2026-10-09T12:00:00Z",
  updated_at: "2026-10-09T12:00:00Z",
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeadCreateDialog />
    </QueryClientProvider>,
  );
}

/** POST calls targeted at the lead creation endpoint only. */
function postCallsToLeads() {
  return mockFetch.mock.calls.filter(
    ([url, init]) => String(url) === "/api/v1/leads" && init?.method === "POST",
  );
}

describe("LeadCreateDialog", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("renders the Nuevo lead trigger button", () => {
    renderDialog();
    expect(
      screen.getByRole("button", { name: /nuevo lead/i }),
    ).toBeInTheDocument();
  });

  it("opens the creation form with all fields when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /nuevo lead/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensaje/i)).toBeInTheDocument();
  });

  it("posts the creation payload and closes on success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createdLeadResponse,
    });
    renderDialog();
    await user.click(screen.getByRole("button", { name: /nuevo lead/i }));
    await screen.findByRole("dialog");

    await user.type(screen.getByLabelText(/nombre/i), "Test Buyer");
    await user.type(screen.getByLabelText(/email/i), "buyer@test.com");
    await user.type(screen.getByLabelText(/tel[eé]fono/i), "+5491100000000");
    await user.type(screen.getByLabelText(/mensaje/i), "Mensaje de prueba");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(postCallsToLeads()).toHaveLength(1);
    });
    const [, init] = postCallsToLeads()[0];
    expect(JSON.parse(String(init.body))).toEqual({
      buyer_name: "Test Buyer",
      buyer_email: "buyer@test.com",
      buyer_phone: "+5491100000000",
      message: "Mensaje de prueba",
    });
    expect(toast.success).toHaveBeenCalledWith("Lead creado");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not call the API and shows validation feedback when buyer_name is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /nuevo lead/i }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(postCallsToLeads()).toHaveLength(0);
    expect(
      await screen.findByText("El nombre del comprador es obligatorio"),
    ).toBeInTheDocument();
  });

  it("shows an error toast and keeps the dialog open when the API fails", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Zone action denied" }),
    });
    renderDialog();
    await user.click(screen.getByRole("button", { name: /nuevo lead/i }));
    await screen.findByRole("dialog");

    await user.type(screen.getByLabelText(/nombre/i), "Test Buyer");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
