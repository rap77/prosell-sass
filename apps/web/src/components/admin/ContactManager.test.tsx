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

  it("renders contact list with correct count", () => {
    const contacts = [
      makeContact({ id: "c1", category: "gerencia" }),
      makeContact({ id: "c2", category: "ventas" }),
    ];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    expect(
      screen.getByRole("heading", { name: "Personas de contacto" }),
    ).toBeInTheDocument();
    // ponytail: check we have 2 contact rows by counting Detalles buttons
    expect(screen.getAllByRole("button", { name: /detalles/i })).toHaveLength(
      2,
    );
  });

  it("adds new contact when clicking Agregar", async () => {
    const user = userEvent.setup();

    render(<ContactManager contacts={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /añadir contacto/i }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "test-uuid-123",
        category: "ventas",
        order: 0,
      }),
    ]);
  });

  it("removes contact when clicking delete button", async () => {
    const user = userEvent.setup();
    const contacts = [makeContact({ id: "c1" })];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Eliminar contacto" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("expands contact details when clicking Detalles", async () => {
    const user = userEvent.setup();
    const contacts = [makeContact()];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /detalles/i }));

    // ponytail: after expansion, phone/email/whatsapp inputs appear
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
  });

  it("updates phone when typing in expanded details", async () => {
    const user = userEvent.setup();
    const contacts = [makeContact({ phone: "" })];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /detalles/i }));

    const phoneInput = screen.getByLabelText(/teléfono/i);
    await user.type(phoneInput, "123");

    // ponytail: each keystroke triggers onChange
    expect(onChange).toHaveBeenCalled();
  });

  it("shows custom label input when category is custom", () => {
    const contacts = [
      makeContact({ category: "custom", custom_label: "Financiamiento" }),
    ];

    render(<ContactManager contacts={contacts} onChange={onChange} />);

    expect(screen.getByTestId("select-trigger")).toHaveTextContent(
      "Personalizado",
    );
    expect(screen.getByDisplayValue("Financiamiento")).toBeInTheDocument();
  });

  it("disables add button when disabled prop is true", () => {
    const contacts = [makeContact()];

    render(<ContactManager contacts={contacts} onChange={onChange} disabled />);

    expect(
      screen.getByRole("button", { name: /añadir contacto/i }),
    ).toBeDisabled();
  });
});
