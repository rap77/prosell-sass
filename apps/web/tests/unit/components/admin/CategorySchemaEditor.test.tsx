import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/lib/api/products", () => ({
  usePatchCategorySchema: vi.fn(),
}));
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  };
});
vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }),
  };
});

import { CategorySchemaEditor } from "@/components/admin/category-schema-editor";
import { usePatchCategorySchema } from "@/lib/api/products";
import type { CategorySchemaResponse } from "@/lib/api/schemas/categorySchema";

const mockSchema: CategorySchemaResponse = {
  attributes: {
    vin: { type: "string", required: true },
    year: { type: "number", required: false, group: "basic" },
  },
  attribute_groups: [{ key: "basic", label: "Basic Info", order: 0 }],
  schema_version: "2026-06-25T12:00:00Z",
  updated_at: "2026-06-25T12:00:00Z",
  migration_warnings: [],
  requires_force: false,
};

const mockMutate = vi.fn();
const mockMutation = { mutateAsync: mockMutate, isPending: false };

describe("CategorySchemaEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(usePatchCategorySchema).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof usePatchCategorySchema>,
    );
  });

  it("renders all existing schema attributes as rows", () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);
    expect(screen.getByDisplayValue("vin")).toBeDefined();
    expect(screen.getByDisplayValue("year")).toBeDefined();
  });

  it("shows required checkbox checked for required fields", () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);
    const vinRequired = screen.getByLabelText(/Required: vin/i);
    const yearRequired = screen.getByLabelText(/Required: year/i);
    expect((vinRequired as HTMLInputElement).getAttribute("data-state")).toBe(
      "checked",
    );
    expect((yearRequired as HTMLInputElement).getAttribute("data-state")).toBe(
      "unchecked",
    );
  });

  it("hides add/edit/delete controls in read-only mode", () => {
    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={mockSchema}
        isReadOnly
      />,
    );
    expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("can add a new field row", async () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(screen.getByRole("button", { name: /add field/i }));

    const inputs = screen.getAllByPlaceholderText(/field name/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("can delete an existing field", async () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    expect(screen.queryAllByText(/vin|year/).length).toBeLessThan(2);
  });

  it("calls mutateAsync with updated schema on save", async () => {
    mockMutate.mockResolvedValue({ ...mockSchema, requires_force: false });
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: "cat-1",
          schema: expect.objectContaining({ vin: expect.any(Object) }),
        }),
      );
    });
  });

  it("renders existing groups in group management panel", () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);
    const input = screen.getByDisplayValue("Basic Info");
    expect(input).toBeDefined();
  });

  it("can add a new group", async () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(screen.getByRole("button", { name: /add group/i }));

    const groupInputs = screen.getAllByPlaceholderText(/group label/i);
    expect(groupInputs.length).toBeGreaterThan(0);
  });

  it("includes groups in the mutateAsync call on save", async () => {
    mockMutate.mockResolvedValue({ ...mockSchema, requires_force: false });
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({ key: "basic" }),
          ]),
        }),
      );
    });
  });

  it("shows migration warning modal when 422 with migration_warnings", async () => {
    const migrationError = new Error(
      JSON.stringify({
        migration_warnings: ["'vin' type string→number (5 products affected)"],
        requires_force: true,
      }),
    );
    mockMutate.mockRejectedValue(migrationError);

    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText("Schema migration required")).toBeDefined();
    });
  });
});
