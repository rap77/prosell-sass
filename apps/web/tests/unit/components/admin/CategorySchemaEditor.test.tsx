import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
      <div data-testid="dnd-context">{children}</div>
    ),
  };
});
vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
    useSortable: ({ id }: { id: string }) => ({
      attributes: { "data-sortable-id": id },
      listeners: { "data-listener-id": id },
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
  attribute_groups: [
    { key: "basic", label: "Basic Info", order: 0 },
    { key: "details", label: "Details", order: 1 },
    { key: "pricing", label: "Pricing", order: 2 },
  ],
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

    // ponytail: multiple "add field" buttons after UI redesign, take first
    const addButtons = screen.getAllByRole("button", { name: /add field/i });
    await userEvent.click(addButtons[0]);

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

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

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

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

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

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Schema migration required")).toBeDefined();
    });
  });

  it("renders a drag handle for each attribute group", () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);
    const handles = screen.getAllByLabelText(/reorder attribute group/i);
    expect(handles.length).toBe(mockSchema.attribute_groups.length);
  });

  it("hides group drag handles in read-only mode", () => {
    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={mockSchema}
        isReadOnly
      />,
    );
    expect(screen.queryByLabelText(/reorder attribute group/i)).toBeNull();
  });

  it("sends groups when saving the attribute groups panel", async () => {
    mockMutate.mockResolvedValue({ ...mockSchema, requires_force: false });
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({ key: "pricing" }),
            expect.objectContaining({ key: "basic" }),
            expect.objectContaining({ key: "details" }),
          ]),
        }),
      );
    });
  });

  it("prompts for confirmation before deleting a group with assigned fields", async () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(
      screen.getByRole("button", { name: /delete group basic/i }),
    );

    expect(
      await screen.findByText(/delete attribute group/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 field/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/delete attribute group/i)).toBeNull();
    });
    expect(screen.getByDisplayValue("Basic Info")).toBeInTheDocument();
  });

  it("removes the group from state when the confirmation is accepted", async () => {
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(
      screen.getByRole("button", { name: /delete group basic/i }),
    );

    await screen.findByText(/delete attribute group/i);
    await userEvent.click(
      screen.getByRole("button", { name: /^delete group$/i }),
    );

    expect(screen.queryByDisplayValue("basic")).toBeNull();
    expect(screen.queryByDisplayValue("Basic Info")).toBeNull();
  });

  it("removes the deleted group row from the panel after save", async () => {
    mockMutate.mockResolvedValue({
      ...mockSchema,
      attribute_groups: mockSchema.attribute_groups.filter(
        (g) => g.key !== "details",
      ),
    });
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    const detailsDelete = screen.getByRole("button", {
      name: /delete group details/i,
    });
    await userEvent.click(detailsDelete);
    await screen.findByText(/delete attribute group/i);
    await userEvent.click(
      screen.getByRole("button", { name: /^delete group$/i }),
    );

    expect(screen.queryByDisplayValue("Details")).toBeNull();
    expect(screen.queryByDisplayValue("details")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.not.arrayContaining([
            expect.objectContaining({ key: "details" }),
          ]),
        }),
      );
    });
  });

  it("reassigns a field's group to no-group when the parent group is deleted on save", async () => {
    mockMutate.mockResolvedValue({
      ...mockSchema,
      attribute_groups: mockSchema.attribute_groups.filter(
        (g) => g.key !== "basic",
      ),
    });
    render(<CategorySchemaEditor categoryId="cat-1" schema={mockSchema} />);

    await userEvent.click(
      screen.getByRole("button", { name: /delete group basic/i }),
    );
    await screen.findByText(/delete attribute group/i);
    await userEvent.click(
      screen.getByRole("button", { name: /^delete group$/i }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
      const lastCallArgs = mockMutate.mock.calls.at(-1)?.[0];
      expect(lastCallArgs?.schema?.year?.group).toBeUndefined();
      expect(lastCallArgs?.schema?.vin?.group).toBeUndefined();
    });
  });

  it("sends groups with a fields[] ordering when a group has explicit field ordering", async () => {
    mockMutate.mockResolvedValue({ ...mockSchema, requires_force: false });
    const schemaWithOrderedGroup: CategorySchemaResponse = {
      ...mockSchema,
      attribute_groups: [
        {
          key: "basic",
          label: "Basic Info",
          order: 0,
          fields: ["year", "vin"],
        },
        ...mockSchema.attribute_groups.filter((g) => g.key !== "basic"),
      ],
    };
    render(
      <CategorySchemaEditor
        categoryId="cat-1"
        schema={schemaWithOrderedGroup}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              key: "basic",
              fields: ["year", "vin"],
            }),
          ]),
        }),
      );
    });
  });
});
