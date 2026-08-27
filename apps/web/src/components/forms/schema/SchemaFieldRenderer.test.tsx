import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { useForm, type Control, type UseFormSetValue } from "react-hook-form";
import { SchemaFieldRenderer } from "./SchemaFieldRenderer";
import type { AttributeSchemaEntry } from "@/types/category";

vi.mock("@/components/ui/select-controlled", () => ({
  SelectControlled: ({
    value,
    onChange,
    options,
    id,
    "aria-label": ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    id?: string;
    "aria-label"?: string;
  }) => (
    <div data-testid="select-controlled" data-value={value}>
      <button
        type="button"
        data-testid={id ?? ariaLabel}
        onClick={() => onChange(options[0]?.value ?? "")}
      >
        trigger
      </button>
      <button
        type="button"
        data-testid="trigger-empty"
        onClick={() => onChange("")}
      >
        reset
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={`option-${opt.value}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

interface HarnessProps {
  entry: AttributeSchemaEntry;
  fieldKey: string;
}

function Harness({ fieldKey, entry }: HarnessProps) {
  const { control, setValue, subscribe } = useForm<Record<string, unknown>>({
    defaultValues: { [fieldKey]: "" },
  });
  const [value, setValueState] = React.useState<string>("");
  React.useEffect(() => {
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        setValueState(String(values[fieldKey] ?? ""));
      },
    });
    return unsubscribe;
  }, [fieldKey, subscribe]);
  return (
    <>
      <SchemaFieldRenderer
        fieldKey={fieldKey}
        entry={entry}
        control={control as unknown as Control<Record<string, unknown>>}
        setValue={
          setValue as unknown as UseFormSetValue<Record<string, unknown>>
        }
        schema={{ [fieldKey]: entry }}
        disabled={false}
      />
      <output data-testid="form-value">{value}</output>
    </>
  );
}

// FR7.1: labels for known vehicle fields must render in Spanish via the
// (previously unwired) vehicle-values.ts dictionary, not the raw
// humanized English field key.
describe("SchemaFieldRenderer field labels", () => {
  it("shows the Spanish label for a known vehicle field with no explicit label", () => {
    function Harness() {
      const { control, setValue } = useForm<Record<string, unknown>>({
        defaultValues: { mileage: "" },
      });
      return (
        <SchemaFieldRenderer
          fieldKey="mileage"
          entry={{ type: "number", filter_type: "text" }}
          control={control as unknown as Control<Record<string, unknown>>}
          setValue={
            setValue as unknown as UseFormSetValue<Record<string, unknown>>
          }
          schema={{}}
          disabled={false}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByText("Kilometraje")).toBeInTheDocument();
    expect(screen.queryByText("Mileage")).not.toBeInTheDocument();
  });

  it("still prefers an explicit schema label when one is set", () => {
    function Harness() {
      const { control, setValue } = useForm<Record<string, unknown>>({
        defaultValues: { custom_field: "" },
      });
      return (
        <SchemaFieldRenderer
          fieldKey="custom_field"
          entry={{
            type: "string",
            filter_type: "text",
            label: "Campo Personalizado",
          }}
          control={control as unknown as Control<Record<string, unknown>>}
          setValue={
            setValue as unknown as UseFormSetValue<Record<string, unknown>>
          }
          schema={{}}
          disabled={false}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByText("Campo Personalizado")).toBeInTheDocument();
  });
});

describe("SchemaFieldRenderer select fields", () => {
  it("persists the selected option value into the form state", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        fieldKey="fuel_type"
        entry={{
          type: "string",
          filter_type: "select",
          label: "Combustible",
          options: ["Gasolina", "Diésel", "Eléctrico"],
        }}
      />,
    );

    await user.click(screen.getByTestId("option-Diésel"));

    await waitFor(() => {
      expect(screen.getByTestId("form-value").textContent).toBe("Diésel");
    });
    expect(
      screen.getByTestId("select-controlled").getAttribute("data-value"),
    ).toBe("Diésel");
  });

  it("renders the selected option label in the trigger when a value is set", () => {
    function PrefilledHarness() {
      const { control, setValue } = useForm<Record<string, unknown>>({
        defaultValues: { fuel_type: "Diésel" },
      });
      return (
        <SchemaFieldRenderer
          fieldKey="fuel_type"
          entry={{
            type: "string",
            filter_type: "select",
            label: "Combustible",
            options: ["Gasolina", "Diésel", "Eléctrico"],
          }}
          control={control as unknown as Control<Record<string, unknown>>}
          setValue={
            setValue as unknown as UseFormSetValue<Record<string, unknown>>
          }
          schema={{
            fuel_type: {
              type: "string",
              filter_type: "select",
              label: "Combustible",
              options: ["Gasolina", "Diésel", "Eléctrico"],
            },
          }}
          disabled={false}
        />
      );
    }

    render(<PrefilledHarness />);
    expect(
      screen.getByTestId("select-controlled").getAttribute("data-value"),
    ).toBe("Diésel");
  });
});
