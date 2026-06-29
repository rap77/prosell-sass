import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GenericFormFields } from "@/components/forms/GenericFormFields";
import type { AttributeGroup, AttributeSchemaEntry } from "@/types/category";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange?.("opt1")}>open</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
}));

const SCHEMA: Record<string, AttributeSchemaEntry> = {
  color: { type: "string", filter_type: "text", label: "Color" },
  price_usd: { type: "number", filter_type: "range", label: "Precio USD" },
  available: { type: "boolean", filter_type: "boolean", label: "Disponible" },
  size: {
    type: "select",
    filter_type: "select",
    label: "Talla",
    options: ["S", "M", "L"],
  },
};

const GROUPS: AttributeGroup[] = [
  { key: "basic", label: "Info Básica", order: 0 },
];

const SCHEMA_WITH_GROUPS: Record<string, AttributeSchemaEntry> = {
  color: {
    type: "string",
    filter_type: "text",
    label: "Color",
    group: "basic",
  },
  size: {
    type: "select",
    filter_type: "select",
    label: "Talla",
    options: ["S", "M", "L"],
    group: "basic",
  },
  notes: { type: "string", filter_type: "text", label: "Notas" },
};

describe("GenericFormFields", () => {
  it("renders a text input for string fields", () => {
    render(
      <GenericFormFields
        schema={{ color: SCHEMA.color }}
        groups={[]}
        values={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByLabelText("Color")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Color" })).toBeInTheDocument();
  });

  it("renders a number input for number fields", () => {
    render(
      <GenericFormFields
        schema={{ price_usd: SCHEMA.price_usd }}
        groups={[]}
        values={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByLabelText("Precio USD");
    expect(input).toHaveAttribute("type", "number");
  });

  it("renders a checkbox for boolean fields", () => {
    render(
      <GenericFormFields
        schema={{ available: SCHEMA.available }}
        groups={[]}
        values={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Disponible" }),
    ).toBeInTheDocument();
  });

  it("calls onChange when a text input changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <GenericFormFields
        schema={{ color: SCHEMA.color }}
        groups={[]}
        values={{}}
        onChange={onChange}
        disabled={false}
      />,
    );
    await user.type(screen.getByRole("textbox", { name: "Color" }), "rojo");
    expect(onChange).toHaveBeenCalledWith("color", expect.any(String));
  });

  it("calls onChange when a checkbox is toggled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <GenericFormFields
        schema={{ available: SCHEMA.available }}
        groups={[]}
        values={{ available: false }}
        onChange={onChange}
        disabled={false}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Disponible" }));
    expect(onChange).toHaveBeenCalledWith("available", true);
  });

  it("renders group headings when attribute_groups provided", () => {
    render(
      <GenericFormFields
        schema={SCHEMA_WITH_GROUPS}
        groups={GROUPS}
        values={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByText("Info Básica")).toBeInTheDocument();
  });

  it("falls back to field key as label when label is absent", () => {
    const schemaNoLabel: Record<string, AttributeSchemaEntry> = {
      weight: { type: "number", filter_type: "range" },
    };
    render(
      <GenericFormFields
        schema={schemaNoLabel}
        groups={[]}
        values={{}}
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByLabelText("weight")).toBeInTheDocument();
  });
});
