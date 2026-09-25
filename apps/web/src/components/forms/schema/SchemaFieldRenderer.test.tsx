import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { useForm, type Control, type UseFormSetValue } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SchemaFieldRenderer } from "./SchemaFieldRenderer";
import type { AttributeSchemaEntry } from "@/types/category";

const { mockUseVehicleModelsForMake } = vi.hoisted(() => ({
  mockUseVehicleModelsForMake: vi.fn(),
}));

vi.mock("@/lib/api/vehicles", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/vehicles")>(
      "@/lib/api/vehicles",
    );
  return {
    ...actual,
    useVehicleModelsForMake: mockUseVehicleModelsForMake,
  };
});

// SchemaFieldRenderer unconditionally calls useVehicleModelsForMake
// (rules-of-hooks — every field instance needs it, not just `model`),
// which needs a QueryClient ancestor even when options_source isn't set
// (the hook itself no-ops via `enabled: false`, but useQuery still reads
// context). Every render() in this file goes through this helper.
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

vi.mock("@/components/ui/select-controlled", () => ({
  SelectControlled: ({
    value,
    onChange,
    options,
    id,
    disabled,
    "aria-label": ariaLabel,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    id?: string;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <div data-testid="select-controlled" data-field-id={id} data-value={value}>
      <button
        type="button"
        data-testid={id ?? ariaLabel}
        disabled={disabled}
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

// Default: no fetch in flight, no data — matches every existing test's
// expectation (they never set options_source, so the real hook would be
// `enabled: false` anyway).
beforeEach(() => {
  mockUseVehicleModelsForMake.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
});

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

    renderWithQuery(<Harness />);
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

    renderWithQuery(<Harness />);
    expect(screen.getByText("Campo Personalizado")).toBeInTheDocument();
  });
});

describe("SchemaFieldRenderer select fields", () => {
  it("persists the selected option value into the form state", async () => {
    const user = userEvent.setup();
    renderWithQuery(
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

    renderWithQuery(<PrefilledHarness />);
    expect(
      screen.getByTestId("select-controlled").getAttribute("data-value"),
    ).toBe("Diésel");
  });
});

// AC1.1.1/AC1.1.2 (u2-vehicle-catalog-ui): the select block reads the RHF
// virtual "_unmatchedFields" channel (written by mapDecodedToForm, see
// VinDecodeField.test.tsx for the write side) via useWatch to decide
// whether to show the mismatch help icon for its own fieldKey.
describe("SchemaFieldRenderer mismatch indicator", () => {
  function MismatchHarness({
    fieldKey,
    unmatchedFields,
  }: {
    fieldKey: string;
    unmatchedFields: string[];
  }) {
    const { control, setValue } = useForm<Record<string, unknown>>({
      defaultValues: { [fieldKey]: "", _unmatchedFields: unmatchedFields },
    });
    return (
      <SchemaFieldRenderer
        fieldKey={fieldKey}
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
        schema={{}}
        disabled={false}
      />
    );
  }

  it("does not show the mismatch help icon for a reconciled field (AC1.1.1)", () => {
    renderWithQuery(
      <MismatchHarness fieldKey="fuel_type" unmatchedFields={[]} />,
    );

    expect(
      screen.queryByText("No se pudo autocompletar — completar a mano"),
    ).not.toBeInTheDocument();
  });

  it("shows the mismatch help icon and text for an unmatched field (AC1.1.2)", () => {
    renderWithQuery(
      <MismatchHarness fieldKey="fuel_type" unmatchedFields={["fuel_type"]} />,
    );

    expect(
      screen.getByText("No se pudo autocompletar — completar a mano"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Combustible: no se pudo autocompletar — completar a mano",
      }),
    ).toBeInTheDocument();
  });

  it("does not show the mismatch help icon when a DIFFERENT field is unmatched", () => {
    renderWithQuery(
      <MismatchHarness fieldKey="fuel_type" unmatchedFields={["body_type"]} />,
    );

    expect(
      screen.queryByText("No se pudo autocompletar — completar a mano"),
    ).not.toBeInTheDocument();
  });
});

// Bug fix (2026-09-25): `model` used to be a free-text input, so nothing
// stopped a hand-typed model that didn't match the vehicle's real make.
// This makes `model` a dependent select fed by GET /vehicles/models,
// gated on the sibling `make` field's current value.
const modelEntry: AttributeSchemaEntry = {
  type: "string",
  filter_type: "text",
  label: "Modelo",
  depends_on: "make",
  options_source: "nhtsa_models",
};

function MakeModelHarness({
  defaultMake = "",
  defaultModel = "",
}: {
  defaultMake?: string;
  defaultModel?: string;
}) {
  const { control, setValue } = useForm<Record<string, unknown>>({
    defaultValues: { make: defaultMake, model: defaultModel },
  });
  const typedSetValue = setValue as unknown as UseFormSetValue<
    Record<string, unknown>
  >;
  const typedControl = control as unknown as Control<Record<string, unknown>>;
  return (
    <>
      <SchemaFieldRenderer
        fieldKey="make"
        entry={{
          type: "string",
          filter_type: "select",
          label: "Marca",
          options: ["Toyota", "Honda"],
        }}
        control={typedControl}
        setValue={typedSetValue}
        schema={{}}
        disabled={false}
      />
      <SchemaFieldRenderer
        fieldKey="model"
        entry={modelEntry}
        control={typedControl}
        setValue={typedSetValue}
        schema={{ make: modelEntry }}
        disabled={false}
      />
    </>
  );
}

describe("SchemaFieldRenderer dependent select (make -> model)", () => {
  it("disables the model select before a make is chosen", () => {
    mockUseVehicleModelsForMake.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderWithQuery(<MakeModelHarness />);

    expect(screen.getByTestId("field-model")).toBeDisabled();
  });

  it("fetches models keyed by the current make value", () => {
    mockUseVehicleModelsForMake.mockReturnValue({
      data: ["Camry", "Corolla"],
      isLoading: false,
    });

    renderWithQuery(<MakeModelHarness defaultMake="Toyota" />);

    expect(mockUseVehicleModelsForMake).toHaveBeenCalledWith("Toyota");
    expect(screen.getByTestId("option-Camry")).toBeInTheDocument();
    expect(screen.getByTestId("option-Corolla")).toBeInTheDocument();
    expect(screen.getByTestId("field-model")).not.toBeDisabled();
  });

  it("shows a loading placeholder and disables the select while models are being fetched", () => {
    mockUseVehicleModelsForMake.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderWithQuery(<MakeModelHarness defaultMake="Toyota" />);

    expect(screen.getByTestId("field-model")).toBeDisabled();
  });

  it("keeps an out-of-catalog current model value selectable", () => {
    mockUseVehicleModelsForMake.mockReturnValue({
      data: ["Camry", "Corolla"],
      isLoading: false,
    });

    renderWithQuery(
      <MakeModelHarness defaultMake="Toyota" defaultModel="Land Cruiser" />,
    );

    const modelSelect = screen
      .getAllByTestId("select-controlled")
      .find((el) => el.getAttribute("data-field-id") === "field-model");
    expect(modelSelect?.getAttribute("data-value")).toBe("Land Cruiser");
    expect(screen.getByTestId("option-Land Cruiser")).toBeInTheDocument();
  });

  it("does not apply Title Case mangling to the selected NHTSA model value", async () => {
    const user = userEvent.setup();
    mockUseVehicleModelsForMake.mockReturnValue({
      data: ["RAV4"],
      isLoading: false,
    });

    renderWithQuery(<MakeModelHarness defaultMake="Toyota" />);
    await user.click(screen.getByTestId("option-RAV4"));

    await waitFor(() => {
      const modelSelect = screen
        .getAllByTestId("select-controlled")
        .find((el) => el.getAttribute("data-field-id") === "field-model");
      expect(modelSelect?.getAttribute("data-value")).toBe("RAV4");
    });
  });
});
