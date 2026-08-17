/**
 * ContactManager.test.tsx — Multi-contact editor tests.
 *
 * Tests add/remove/edit operations. Skips drag-and-drop (requires
 * complex dnd-kit mocking for minimal coverage gain).
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ContactManager } from "./ContactManager";
import type { OrganizationContact } from "@/lib/api/schemas/organizations";

// ponytail: mock crypto.randomUUID for predictable IDs
vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-123" });

const makeContact = (
  overrides: Partial<OrganizationContact> = {},
): OrganizationContact => ({
  id: "c1",
  name: "Juan Pérez",
  category: "ventas",
  custom_label: null,
  phone: "+5491155551234",
  email: "ventas@test.com",
  whatsapp: null,
  order: 0,
  ...overrides,
});

describe("ContactManager", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("shows empty state when no contacts", () => {
    render(<ContactManager contacts={[]} onChange={onChange} />);

    expect(screen.getByText(/no hay contactos/i)).toBeInTheDocument();
  });

  it("removes contact when clicking delete button", async () => {
    const user = userEvent.setup();
    const contacts = [makeContact({ id: "c1" })];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Eliminar contacto" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables add button when disabled prop is true", () => {
    const contacts = [makeContact()];

    render(<ContactManager contacts={contacts} onChange={onChange} disabled />);

    expect(screen.getByRole("button", { name: /agregar/i })).toBeDisabled();
  });

  // ponytail: TDD tests for new broker-style UX (name + inline form + cards)

  it("renders name input in the inline form", () => {
    render(<ContactManager contacts={[]} onChange={onChange} />);

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it("disables Agregar button when name is empty", () => {
    render(<ContactManager contacts={[]} onChange={onChange} />);

    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).toBeDisabled();
  });

  it("enables Agregar button when name is filled", async () => {
    const user = userEvent.setup();
    render(<ContactManager contacts={[]} onChange={onChange} />);

    const nameInput = screen.getByLabelText(/nombre/i);
    await user.type(nameInput, "Juan Pérez");

    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).toBeEnabled();
  });

  it("clicking Agregar creates a card with all visible details", async () => {
    const user = userEvent.setup();
    render(<ContactManager contacts={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText(/nombre/i), "Juan Pérez");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "test-uuid-123",
        name: "Juan Pérez",
        category: "ventas",
        order: 0,
      }),
    ]);
  });

  it("clears the form after Agregar is clicked", async () => {
    const user = userEvent.setup();
    render(<ContactManager contacts={[]} onChange={onChange} />);

    const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
    await user.type(nameInput, "Juan Pérez");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(nameInput.value).toBe("");
  });

  it("renders the contact name in the card header", () => {
    const contacts = [makeContact({ name: "María López" })];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    expect(screen.getByText("María López")).toBeInTheDocument();
  });

  it("shows Edit (pencil) button on each card to enable inline edit", () => {
    const contacts = [makeContact({ name: "Juan Pérez" })];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    expect(
      screen.getByRole("button", { name: /editar contacto/i }),
    ).toBeInTheDocument();
  });

  it("clicking Edit transforms the card into an inline editable form", async () => {
    const user = userEvent.setup();
    const contacts = [
      makeContact({ id: "c1", name: "Juan Pérez", email: "juan@test.com" }),
    ];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /editar contacto/i }));

    // ponytail: after edit, the name input pre-filled with current name appears
    const nameInput = screen.getByDisplayValue("Juan Pérez");
    expect(nameInput).toBeInTheDocument();
  });
});
