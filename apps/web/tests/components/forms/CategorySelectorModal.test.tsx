import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CategorySelectorModal } from "@/components/forms/CategorySelectorModal";
import type { VerticalResponse, CategoryNode } from "@/types/category";

function makeCategory(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    id: "c1",
    name: "Terrestres",
    slug: "vehiculos-terrestres",
    attribute_schema: {},
    attribute_groups: [],
    presentation: null,
    filter_fields: [],
    ...overrides,
  };
}

function makeVertical(
  overrides: Partial<VerticalResponse> = {},
): VerticalResponse {
  return {
    id: "v1",
    name: "Vehículos",
    slug: "vehiculos",
    presentation: null,
    categories: [makeCategory()],
    ...overrides,
  };
}

describe("CategorySelectorModal", () => {
  it("shows loading message when verticals is empty", () => {
    render(<CategorySelectorModal verticals={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("auto-advances to categories when there is a single vertical", () => {
    const vertical = makeVertical({
      categories: [
        makeCategory({
          id: "c1",
          name: "Terrestres",
          slug: "vehiculos-terrestres",
        }),
        makeCategory({
          id: "c2",
          name: "Acuáticos",
          slug: "vehiculos-acuaticos",
        }),
      ],
    });
    render(<CategorySelectorModal verticals={[vertical]} onSelect={vi.fn()} />);
    expect(screen.getByText("Terrestres")).toBeInTheDocument();
    expect(screen.getByText("Acuáticos")).toBeInTheDocument();
    expect(screen.queryByText(/volver/i)).not.toBeInTheDocument();
  });

  it("shows vertical cards when there are multiple verticals", () => {
    const verticals = [
      makeVertical({ id: "v1", name: "Vehículos", slug: "vehiculos" }),
      makeVertical({
        id: "v2",
        name: "Inmuebles",
        slug: "inmuebles",
        categories: [],
      }),
    ];
    render(<CategorySelectorModal verticals={verticals} onSelect={vi.fn()} />);
    expect(screen.getByText("Vehículos")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles")).toBeInTheDocument();
  });

  it("navigates to categories on vertical click", async () => {
    const user = userEvent.setup();
    const v1 = makeVertical({
      id: "v1",
      name: "Vehículos",
      categories: [makeCategory({ name: "Terrestres" })],
    });
    const v2 = makeVertical({
      id: "v2",
      name: "Inmuebles",
      slug: "inmuebles",
      categories: [],
    });
    render(<CategorySelectorModal verticals={[v1, v2]} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    expect(screen.getByText("Terrestres")).toBeInTheDocument();
    expect(screen.getByText(/volver/i)).toBeInTheDocument();
  });

  it("calls onSelect with the clicked category", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const cat = makeCategory({
      id: "c1",
      name: "Terrestres",
      slug: "vehiculos-terrestres",
    });
    render(
      <CategorySelectorModal
        verticals={[makeVertical({ categories: [cat] })]}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Terrestres" }));
    expect(onSelect).toHaveBeenCalledWith(cat);
  });

  it("goes back to vertical list on back button click", async () => {
    const user = userEvent.setup();
    const v1 = makeVertical({
      id: "v1",
      name: "Vehículos",
      categories: [makeCategory({ name: "Terrestres" })],
    });
    const v2 = makeVertical({
      id: "v2",
      name: "Inmuebles",
      slug: "inmuebles",
      categories: [],
    });
    render(<CategorySelectorModal verticals={[v1, v2]} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    expect(screen.getByText("Terrestres")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /volver/i }));
    expect(screen.getByText("Vehículos")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles")).toBeInTheDocument();
  });
});
