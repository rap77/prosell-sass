/**
 * BrokerManager.test.tsx — broker phone support.
 *
 * Brokers carry an optional phone alongside email: the add form captures it,
 * the list displays it, and edit mode can change it (pending brokers only).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { BrokerManager } from "@/components/admin/BrokerManager";

const mockUseOrganizationBrokers = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizationBrokers: () => mockUseOrganizationBrokers(),
  useCreateOrganizationBroker: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateOrganizationBroker: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteOrganizationBroker: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function makeBroker(overrides: Record<string, unknown> = {}) {
  return {
    id: "broker-1",
    name: "Ana Broker",
    email: "ana@x.com",
    phone: "+58 412 5551234",
    user_id: null,
    status: "pending" as const,
    created_at: "2026-01-01T00:00:00Z",
    verified_at: null,
    ...overrides,
  };
}

describe("BrokerManager — phone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
  });

  it("shows the broker phone in the list", () => {
    mockUseOrganizationBrokers.mockReturnValue({
      data: [makeBroker()],
      isLoading: false,
    });

    render(<BrokerManager organizationId="dealer-1" />);

    expect(screen.getByText("+58 412 5551234")).toBeInTheDocument();
  });

  it("sends phone when creating a broker", () => {
    mockUseOrganizationBrokers.mockReturnValue({ data: [], isLoading: false });

    render(<BrokerManager organizationId="dealer-1" />);

    fireEvent.click(screen.getByRole("button", { name: /agregar broker/i }));
    fireEvent.change(screen.getByPlaceholderText(/nombre del broker/i), {
      target: { value: "Beto" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^email$/i), {
      target: { value: "beto@x.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+54 9 11 1234-5678/i), {
      target: { value: "+58 416 7778899" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^agregar$/i }));

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      organizationId: "dealer-1",
      name: "Beto",
      email: "beto@x.com",
      phone: "+58 416 7778899",
    });
  });

  it("sends phone when editing a pending broker", () => {
    mockUseOrganizationBrokers.mockReturnValue({
      data: [makeBroker()],
      isLoading: false,
    });

    render(<BrokerManager organizationId="dealer-1" />);

    fireEvent.click(screen.getByTitle(/editar/i));
    fireEvent.change(screen.getByPlaceholderText(/\+54 9 11 1234-5678/i), {
      target: { value: "+58 424 0000000" },
    });
    // ponytail: the check icon button is the only unnamed button in edit mode
    fireEvent.click(screen.getByTitle(/guardar/i));

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      organizationId: "dealer-1",
      brokerId: "broker-1",
      name: "Ana Broker",
      email: "ana@x.com",
      phone: "+58 424 0000000",
    });
  });
});
