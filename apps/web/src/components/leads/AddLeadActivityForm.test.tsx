/**
 * AddLeadActivityForm — "+ Nota" / "+ Llamada" per the CRM roadmap Fase 4
 * mockup (docs/twenty-crm-adoption.md).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddLeadActivityForm } from "./AddLeadActivityForm";

const mockMutateAsync = vi.fn();
vi.mock("@/lib/api/leads", () => ({
  useCreateLeadActivity: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe("AddLeadActivityForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to Nota and submits with the typed content", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});
    render(<AddLeadActivityForm leadId="lead-1" />);

    await user.type(
      screen.getByPlaceholderText(/agregar una nota/i),
      "Cliente pide fotos",
    );
    await user.click(screen.getByRole("button", { name: /^agregar$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      type: "note",
      content: "Cliente pide fotos",
    });
  });

  it("switches to Llamada and submits with that type", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});
    render(<AddLeadActivityForm leadId="lead-1" />);

    await user.click(screen.getByRole("button", { name: /^llamada$/i }));
    await user.type(
      screen.getByPlaceholderText(/agregar una nota/i),
      "Primera llamada, muy interesado",
    );
    await user.click(screen.getByRole("button", { name: /^agregar$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      type: "call",
      content: "Primera llamada, muy interesado",
    });
  });

  it("does not submit with empty content", async () => {
    const user = userEvent.setup();
    render(<AddLeadActivityForm leadId="lead-1" />);

    await user.click(screen.getByRole("button", { name: /^agregar$/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("clears the textarea after a successful submit", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});
    render(<AddLeadActivityForm leadId="lead-1" />);

    const textarea = screen.getByPlaceholderText(/agregar una nota/i);
    await user.type(textarea, "Cliente pide fotos");
    await user.click(screen.getByRole("button", { name: /^agregar$/i }));

    expect(textarea).toHaveValue("");
  });
});
