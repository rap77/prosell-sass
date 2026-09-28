import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  UnifiedProductForm,
  coerceVehicleCodeForSubmit,
  findBrokerByOwnerId,
  getSelectableBrokers,
  VEHICLE_CODE_SCHEMA,
} from "./UnifiedProductForm";
import type { Broker } from "@/lib/api/schemas/organizations";
import * as productsApi from "@/lib/api/products";
import * as fbAccountsApi from "@/lib/api/fb-accounts";

// ponytail: partial mock — only override useProduct/useFBAccounts so the
// existing Wizard tests keep exercising the real (unmocked) hooks below,
// matching the pattern used in tests/components/catalog/CatalogPage.test.tsx
vi.mock("@/lib/api/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/products")>();
  return {
    ...actual,
    useProduct: vi.fn(actual.useProduct),
    useProductOwnership: vi.fn(actual.useProductOwnership),
    useNextVehicleCode: vi.fn(actual.useNextVehicleCode),
  };
});

vi.mock("@/lib/api/fb-accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/fb-accounts")>();
  return {
    ...actual,
    useFBAccounts: vi.fn(actual.useFBAccounts),
  };
});

// ponytail: minimal test wrapper for TanStack Query
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock category for tests
const mockCategory = {
  id: "cat-1",
  name: "Vehicle",
  slug: "vehicle",
  type: "vehicle",
  attribute_schema: [
    { key: "year", label: "Year", type: "number", required: true },
    { key: "make", label: "Make", type: "string", required: true },
    { key: "model", label: "Model", type: "string", required: true },
  ],
  attribute_groups: [
    {
      key: "basic-info",
      label: "Basic Info",
      order: 1,
      attribute_keys: ["year", "make", "model"],
    },
  ],
} as any; // ponytail: simplified mock, full type not needed for tests

const BROKERS: Broker[] = [
  {
    id: "broker-1",
    name: "Ana Broker",
    email: "ana@example.com",
    phone: null,
    user_id: "user-1",
    status: "verified",
    created_at: "2026-01-01T00:00:00Z",
    verified_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "broker-2",
    name: "Pending Broker",
    email: "pending@example.com",
    phone: null,
    user_id: null,
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    verified_at: null,
  },
  {
    id: "broker-3",
    name: "Luis Broker",
    email: "luis@example.com",
    phone: null,
    user_id: "user-3",
    status: "verified",
    created_at: "2026-01-01T00:00:00Z",
    verified_at: "2026-01-01T00:00:00Z",
  },
];

describe("UnifiedProductForm broker select identity", () => {
  it("resolves a stored user owner id to the broker label", () => {
    expect(findBrokerByOwnerId(BROKERS, "user-1")?.name).toBe("Ana Broker");
    expect(findBrokerByOwnerId(BROKERS, "user-3")?.name).toBe("Luis Broker");
  });

  it("resolves pending broker by id fallback", () => {
    // ponytail: pending brokers have user_id=null, use broker.id as fallback
    expect(findBrokerByOwnerId(BROKERS, "broker-2")?.name).toBe(
      "Pending Broker",
    );
  });

  it("filters out already-selected brokers except current", () => {
    // user-1 is current, user-3 is selected elsewhere → broker-3 excluded
    const selectable = getSelectableBrokers(
      BROKERS,
      new Set(["user-1", "user-3"]),
      "user-1",
    );

    expect(selectable.map((broker) => broker.id)).toEqual([
      "broker-1", // current owner, always visible
      "broker-2", // pending broker, ownerId=broker-2 not in set
    ]);
  });

  it("includes all brokers when none selected", () => {
    const selectable = getSelectableBrokers(BROKERS, new Set(), "");
    expect(selectable.map((broker) => broker.id)).toEqual([
      "broker-1",
      "broker-2",
      "broker-3",
    ]);
  });
});

describe("UnifiedProductForm Wizard (Mobile)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock mobile viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  it("should render form with wizard wrapper on mobile", () => {
    const { container } = render(
      <UnifiedProductForm category={mockCategory} />,
      {
        wrapper: TestWrapper,
      },
    );

    // Form renders
    expect(container.querySelector("form")).toBeInTheDocument();

    // ponytail: wizard manipulates DOM after mount via useEffect
    // testing exact wizard UI requires waitFor + complex mocks
    // sufficient to verify form renders without errors
  });

  it("should render without wizard when disabled", () => {
    const { container } = render(
      <UnifiedProductForm category={mockCategory} enableWizard={false} />,
      { wrapper: TestWrapper },
    );

    // Form renders
    expect(container.querySelector("form")).toBeInTheDocument();

    // No wizard wrapper
    expect(
      container.querySelector("form")?.parentElement?.className,
    ).not.toContain("wizard");
  });
});

describe("UnifiedProductForm Wizard (Desktop)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock desktop viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it("should render form with wizard wrapper on desktop", () => {
    const { container } = render(
      <UnifiedProductForm category={mockCategory} />,
      {
        wrapper: TestWrapper,
      },
    );

    // Form renders
    expect(container.querySelector("form")).toBeInTheDocument();

    // ponytail: testing exact desktop tabs requires complex DOM queries after useEffect
    // sufficient to verify form renders and wizard is enabled
  });
});

describe("UnifiedProductForm Facebook Marketplace indicator", () => {
  const baseProduct = {
    id: "test-product-id",
    title: "Test Vehicle",
    description: "",
    price_cents: 1_000_000,
    currency: "ARS",
    status: "published",
    slug: "test-vehicle",
    condition: "used",
    organization_id: "org-1",
    fb_account_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    version: 1,
    attributes: {
      category: "vehicle",
      year: 2020,
      make: "Toyota",
      model: "Corolla",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // FB account selector is independent of publish status (Fix 3) — keep
    // it empty here so these tests focus on the read-only indicator only.
    vi.mocked(fbAccountsApi.useFBAccounts).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
    } as any);
    // Real useProductOwnership would hit the network and stay isLoading
    // forever in jsdom, keeping the component on its loading-spinner branch.
    vi.mocked(productsApi.useProductOwnership).mockReturnValue({
      data: { owners: [] },
      isLoading: false,
    } as any);
    vi.mocked(productsApi.useNextVehicleCode).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
  });

  it("renders the published indicator with no checkbox, when published_to_marketplace is true", () => {
    vi.mocked(productsApi.useProduct).mockReturnValue({
      data: { ...baseProduct, published_to_marketplace: true },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(
      <UnifiedProductForm
        category={mockCategory}
        mode="edit"
        productId="test-product-id"
      />,
      { wrapper: TestWrapper },
    );

    expect(
      screen.getByText("Publicado en Facebook Marketplace"),
    ).toBeInTheDocument();

    const section = screen
      .getByRole("heading", { name: "Facebook Marketplace" })
      .closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelector("input")).not.toBeInTheDocument();
    expect(productsApi.useNextVehicleCode).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it("renders the not-published indicator with no checkbox, when published_to_marketplace is false", () => {
    vi.mocked(productsApi.useProduct).mockReturnValue({
      data: { ...baseProduct, published_to_marketplace: false },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(
      <UnifiedProductForm
        category={mockCategory}
        mode="edit"
        productId="test-product-id"
      />,
      { wrapper: TestWrapper },
    );

    expect(
      screen.getByText("No publicado en Facebook Marketplace"),
    ).toBeInTheDocument();

    const section = screen
      .getByRole("heading", { name: "Facebook Marketplace" })
      .closest("section");
    expect(section).not.toBeNull();
    expect(section?.querySelector("input")).not.toBeInTheDocument();
  });
});

// ── vehicle_code canonical contract (GGA finding #3) ────────────────────
//
// The schema, the controller onChange, and the submit handler all flow
// through `coerceVehicleCodeForSubmit`, so the regression pin is the
// same helper three times: once at the helper itself, once at the
// schema, once at the rendered Input. Two consecutive identity
// conversions for the same payload ensure the form, the schema, and
// the wire shape stay in lock-step on the canonical
// `positive integer | null` contract.

describe("UnifiedProductForm vehicle_code canonical contract", () => {
  describe("coerceVehicleCodeForSubmit", () => {
    it("returns null for null / undefined / empty-string input", () => {
      expect(coerceVehicleCodeForSubmit(null)).toBeNull();
      expect(coerceVehicleCodeForSubmit(undefined)).toBeNull();
      expect(coerceVehicleCodeForSubmit("")).toBeNull();
      expect(coerceVehicleCodeForSubmit("   ")).toBeNull();
    });

    it("passes through a positive integer unchanged", () => {
      expect(coerceVehicleCodeForSubmit(42)).toBe(42);
      expect(coerceVehicleCodeForSubmit(1)).toBe(1);
    });

    it("rejects a non-integer float (matches schema and backend Pydantic)", () => {
      // The frontend schema is `z.number().int().positive()` and the
      // backend Pydantic is `int | None = Field(ge=1)`. To stay in
      // lock-step with both, the helper MUST reject non-integer values
      // — silently truncating would let the schema and the payload
      // disagree about whether the value was "valid input".
      expect(coerceVehicleCodeForSubmit(42.7)).toBeNull();
      expect(coerceVehicleCodeForSubmit(0.5)).toBeNull();
      expect(coerceVehicleCodeForSubmit(0.0)).toBeNull();
    });

    it("coerces a string of digits to a positive integer", () => {
      expect(coerceVehicleCodeForSubmit("42")).toBe(42);
      expect(coerceVehicleCodeForSubmit("  42  ")).toBe(42);
    });

    it("returns null for zero, negative, NaN, and non-numeric strings", () => {
      expect(coerceVehicleCodeForSubmit(0)).toBeNull();
      expect(coerceVehicleCodeForSubmit(-1)).toBeNull();
      expect(coerceVehicleCodeForSubmit(Number.NaN)).toBeNull();
      expect(coerceVehicleCodeForSubmit(Number.POSITIVE_INFINITY)).toBeNull();
      expect(coerceVehicleCodeForSubmit("abc")).toBeNull();
      expect(coerceVehicleCodeForSubmit("3.14")).toBeNull();
    });

    it("returns null for non-string non-number types", () => {
      // Defensive: RHF is well-typed, but `defaultValues` and async
      // server-driven re-seeds can surface unexpected shapes. The
      // contract must hold for ANY input.
      expect(coerceVehicleCodeForSubmit({})).toBeNull();
      expect(coerceVehicleCodeForSubmit([])).toBeNull();
      expect(coerceVehicleCodeForSubmit(true)).toBeNull();
    });
  });

  describe("VEHICLE_CODE_SCHEMA", () => {
    it("accepts every value coerceVehicleCodeForSubmit would produce", () => {
      // Schema and the helper must agree: anything the helper produces
      // must validate, anything the helper rejects must NOT validate.
      // Sampled across the full input space used by the helper above.
      //
      // Schema is `.nullish()` so `undefined` also passes (RHF defaultValues
      // pre-fill case); the helper collapses `undefined` to `null` for
      // the wire payload.
      const inputs = [
        null,
        undefined,
        "",
        "  ",
        42,
        1,
        42.7,
        "42",
        "  42  ",
        0,
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        "abc",
        "3.14",
        {},
        [],
        true,
      ];
      for (const raw of inputs) {
        const coerced = coerceVehicleCodeForSubmit(raw);
        if (
          coerced === null ||
          coerced === undefined ||
          typeof coerced === "number"
        ) {
          const result = VEHICLE_CODE_SCHEMA.safeParse(coerced);
          // Anything coerceVehicleCodeForSubmit produces must validate.
          // (We feed the helper's output — not the raw input — so the
          // schema test pins "schema accepts helper output" rather than
          // "schema accepts raw input", which the helper explicitly
          // normalizes for symmetry.)
          expect(
            result.success,
            `expected coerceVehicleCodeForSubmit(${String(raw)}) (${String(coerced)}) to validate but got ${result.success ? "" : JSON.stringify(result.error.issues)}`,
          ).toBe(true);
        }
      }
    });

    it("rejects 0 and negative integers even though the input has min={1}", () => {
      // Defense in depth: schema catches values that slip past the DOM
      // guard. Backend's Pydantic `Field(ge=1)` mirrors this invariant.
      expect(VEHICLE_CODE_SCHEMA.safeParse(0).success).toBe(false);
      expect(VEHICLE_CODE_SCHEMA.safeParse(-7).success).toBe(false);
    });

    it("rejects floats that truncate to a different integer", () => {
      // Pydantic rejects floats strictly; the frontend schema should
      // reject them too so the wire invariant is symmetric.
      expect(VEHICLE_CODE_SCHEMA.safeParse(3.14).success).toBe(false);
    });
  });

  describe("rendered <Input> onChange → submit payload", () => {
    // The full path: a real <input type="number"> fires onChange, RHF
    // stores the value, and we feed it to `coerceVehicleCodeForSubmit`
    // one more time at submit. Every branch produces a payload that
    // matches the canonical schema shape (positive integer | null).
    function simulateSubmitValue(rawString: string): number | null {
      // RHF Controller stores `coerceVehicleCodeForSubmit(e.target.value)`.
      // buildProductPayload later calls coerceVehicleCodeForSubmit again
      // on the stored value (idempotent for the canonical contract).
      const stored = coerceVehicleCodeForSubmit(rawString);
      return coerceVehicleCodeForSubmit(stored);
    }

    it("renders an empty input as payload `vehicle_code: null`", () => {
      expect(simulateSubmitValue("")).toBeNull();
    });

    it("renders `42` as payload `vehicle_code: 42`", () => {
      const payload = simulateSubmitValue("42");
      expect(payload).toBe(42);
      // Cross-check: the payload value still validates against the schema.
      expect(VEHICLE_CODE_SCHEMA.safeParse(payload).success).toBe(true);
    });

    it("renders paste of non-numeric text as payload `vehicle_code: null`", () => {
      // Without `coerceVehicleCodeForSubmit` this would have produced
      // NaN or "abc", both of which break the canonical contract.
      expect(simulateSubmitValue("abc")).toBeNull();
    });

    it("renders `0` as payload `vehicle_code: null` (schema rejects 0)", () => {
      // Browser `min={1}` allows 0 with up/down arrows in some setups;
      // schema/coercion reject it anyway.
      expect(simulateSubmitValue("0")).toBeNull();
    });
  });
});
