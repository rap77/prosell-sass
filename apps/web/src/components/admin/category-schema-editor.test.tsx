import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildGroupsWithFieldOrder,
  CategorySchemaEditor,
  toSchemaMap,
} from "./category-schema-editor";
import type { CategorySchemaResponse } from "@/lib/api/schemas/categorySchema";
import { useCanonicalFieldOptions } from "@/lib/api/categories";

vi.mock("@/lib/api/products", () => ({
  usePatchCategorySchema: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/api/categories", () => ({
  useCanonicalFieldOptions: vi.fn(),
}));

describe("buildGroupsWithFieldOrder", () => {
  it("persists the visual field order for each group", () => {
    const groups = [
      { _id: "basic", key: "basic", label: "Basic", order: 0 },
      { _id: "engine", key: "engine", label: "Engine", order: 1 },
    ];
    const rows = [
      { _id: "model", key: "model", group: "basic" },
      { _id: "year", key: "year", group: "basic" },
      { _id: "fuel", key: "fuel", group: "engine" },
    ];

    expect(buildGroupsWithFieldOrder(groups, rows)).toEqual([
      {
        key: "basic",
        label: "Basic",
        order: 0,
        fields: ["model", "year"],
      },
      { key: "engine", label: "Engine", order: 1, fields: ["fuel"] },
    ]);
  });
});

// FR3.1/FR3.2: the unified schema contract carries `options` through the
// editor whenever present. The product-form renderer (SchemaFieldRenderer)
// decides to show a select purely from `options.length > 0`, never from
// render_as — most select fields in the vehicles seed (fuel_type,
// transmission, etc.) only set filter_type: "select" and never set
// render_as at all. Gating persistence on render_as === "select" silently
// dropped `options` on every save for those fields (confirmed root cause
// of select fields turning into plain text inputs after a schema save).
describe("toSchemaMap", () => {
  it("includes options when render_as is select", () => {
    const rows = [
      {
        key: "body_type",
        type: "string" as const,
        required: false,
        label: "Body Type",
        description: undefined,
        group: undefined,
        render_as: "select" as const,
        vin_decode_key: undefined,
        options: ["Sedan", "Hatchback", "SUV"],
      },
    ];

    expect(toSchemaMap(rows, new Set())).toEqual({
      body_type: {
        type: "string",
        required: false,
        label: "Body Type",
        description: undefined,
        group: undefined,
        render_as: "select",
        vin_decode_key: undefined,
        options: ["Sedan", "Hatchback", "SUV"],
      },
    });
  });

  it("includes options even when render_as is unset", () => {
    const rows = [
      {
        key: "fuel_type",
        type: "string" as const,
        required: false,
        label: "Fuel Type",
        description: undefined,
        group: undefined,
        render_as: undefined,
        vin_decode_key: undefined,
        options: ["gasoline", "diesel", "hybrid", "electric"],
      },
    ];

    expect(toSchemaMap(rows, new Set()).fuel_type.options).toEqual([
      "gasoline",
      "diesel",
      "hybrid",
      "electric",
    ]);
  });

  it("drops options when the field has none", () => {
    const rows = [
      {
        key: "mileage",
        type: "number" as const,
        required: false,
        label: "Mileage",
        description: undefined,
        group: undefined,
        render_as: undefined,
        vin_decode_key: undefined,
        options: undefined,
      },
    ];

    expect(toSchemaMap(rows, new Set()).mileage.options).toBeUndefined();
  });
});

// US1.2/AC1.2.1 (u2-vehicle-catalog-ui): for the 9 vehicle-vocabulary
// field keys, options load from the canonical catalog endpoint
// (GET /categories/facebook-values/{field_key}) instead of the static
// FACEBOOK_FIELD_KEY_MAP/facebook-values map. Non-vehicle field keys keep
// using the static map unchanged.
describe("CategorySchemaEditor canonical vehicle catalog consumption", () => {
  const mockUseCanonicalFieldOptions = vi.mocked(useCanonicalFieldOptions);

  beforeEach(() => {
    mockUseCanonicalFieldOptions.mockReset();
  });

  function schemaWith(
    attributes: CategorySchemaResponse["attributes"],
  ): CategorySchemaResponse {
    return {
      attributes,
      attribute_groups: [],
      schema_version: "1",
      updated_at: "2026-09-17T00:00:00Z",
      migration_warnings: [],
      requires_force: false,
    };
  }

  async function expandRow(rowKey: string) {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /expand details/i }));
    return { user, rowKey };
  }

  it("populates options exactly from the canonical catalog endpoint for a vehicle row.key (AC1.2.1)", async () => {
    mockUseCanonicalFieldOptions.mockReturnValue({
      data: ["Sedán", "SUV", "Hatchback"],
      isLoading: false,
    } as unknown as ReturnType<typeof useCanonicalFieldOptions>);

    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={schemaWith({
          body_type: { type: "string", required: false },
        })}
      />,
    );

    const { user } = await expandRow("body_type");
    const loadButton = screen.getByRole("button", {
      name: "Load canonical vehicle catalog values for body_type",
    });
    await user.click(loadButton);

    expect(
      screen.getByPlaceholderText("e.g. Sedan, Hatchback, SUV"),
    ).toHaveValue("Sedán, SUV, Hatchback");
    // Exact set — asserts against the real endpoint response, not just
    // "some" options (team-practices.md § Testing Posture point 1).
    expect(mockUseCanonicalFieldOptions).toHaveBeenCalledWith("body_type");
  });

  it("falls back to the manual Options input when the canonical endpoint 404s (no data)", async () => {
    mockUseCanonicalFieldOptions.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useCanonicalFieldOptions>);

    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={schemaWith({
          drivetrain: { type: "string", required: false },
        })}
      />,
    );

    await expandRow("drivetrain");

    expect(
      screen.getByPlaceholderText("e.g. Sedan, Hatchback, SUV"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Load canonical vehicle catalog values/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("leaves a non-vehicle row.key unaffected — still uses the static Facebook catalog map", async () => {
    // `platform` is not in VEHICLE_FIELD_KEYS — the hook is called with
    // `undefined` (query disabled) and must not gate the static button.
    mockUseCanonicalFieldOptions.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useCanonicalFieldOptions>);

    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={schemaWith({
          platform: { type: "string", required: false },
        })}
      />,
    );

    const { user } = await expandRow("platform");
    expect(
      screen.getByRole("button", {
        name: "Load official Facebook values for platform",
      }),
    ).toBeInTheDocument();
    expect(mockUseCanonicalFieldOptions).toHaveBeenCalledWith(undefined);

    await user.click(
      screen.getByRole("button", {
        name: "Load official Facebook values for platform",
      }),
    );
    expect(
      screen.getByPlaceholderText("e.g. Sedan, Hatchback, SUV"),
    ).not.toHaveValue("");
  });
});
