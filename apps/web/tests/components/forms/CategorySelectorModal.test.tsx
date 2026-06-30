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

  it("shows vertical cards at level 0 even with a single vertical", () => {
    const vertical = makeVertical({
      categories: [
        makeCategory({ id: "c1", name: "Terrestres", slug: "vehiculos-terrestres" }),
        makeCategory({ id: "c2", name: "Acuáticos", slug: "vehiculos-acuaticos" }),
      ],
    });
    render(<CategorySelectorModal verticals={[vertical]} onSelect={vi.fn()} />);
    expect(screen.getByText("Vehículos")).toBeInTheDocument();
    expect(screen.queryByText("Terrestres")).not.toBeInTheDocument();
    expect(screen.queryByText(/volver/i)).not.toBeInTheDocument();
  });

  it("shows multiple vertical cards at level 0", () => {
    const verticals = [
      makeVertical({ id: "v1", name: "Vehículos", slug: "vehiculos" }),
      makeVertical({ id: "v2", name: "Inmuebles", slug: "inmuebles", categories: [] }),
    ];
    render(<CategorySelectorModal verticals={verticals} onSelect={vi.fn()} />);
    expect(screen.getByText("Vehículos")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles")).toBeInTheDocument();
  });

  it("navigates into a vertical on click", async () => {
    const user = userEvent.setup();
    const v1 = makeVertical({
      id: "v1",
      name: "Vehículos",
      categories: [makeCategory({ name: "Terrestres" })],
    });
    render(<CategorySelectorModal verticals={[v1]} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    expect(screen.getByText("Terrestres")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /volver/i })).toBeInTheDocument();
  });

  it("calls onSelect when a leaf category is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const cat = makeCategory({ id: "c1", name: "Terrestres", slug: "vehiculos-terrestres" });
    const vertical = makeVertical({ categories: [cat] });
    render(<CategorySelectorModal verticals={[vertical]} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    await user.click(screen.getByRole("button", { name: "Terrestres" }));
    expect(onSelect).toHaveBeenCalledWith(cat);
  });

  it("drills into a non-leaf category without calling onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const leaf = makeCategory({ id: "c2", name: "Sedán", slug: "sedan" });
    const mid = makeCategory({ id: "c1", name: "Carros", slug: "carros", children: [leaf] });
    const vertical = makeVertical({ categories: [mid] });
    render(<CategorySelectorModal verticals={[vertical]} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    await user.click(screen.getByRole("button", { name: /carros/i }));
    expect(screen.getByText("Sedán")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("goes back on back button click", async () => {
    const user = userEvent.setup();
    const v1 = makeVertical({
      id: "v1",
      name: "Vehículos",
      categories: [makeCategory({ name: "Terrestres" })],
    });
    const v2 = makeVertical({ id: "v2", name: "Inmuebles", slug: "inmuebles", categories: [] });
    render(<CategorySelectorModal verticals={[v1, v2]} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /vehículos/i }));
    await user.click(screen.getByRole("button", { name: /volver/i }));
    expect(screen.getByText("Vehículos")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles")).toBeInTheDocument();
  });
});
