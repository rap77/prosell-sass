/**
 * CategorySelector — leaves with breadcrumb + product counts.
 *
 * Subsystem B (Task 11) plus the leaf-only follow-up: the dropdown now
 * consumes `LeafWithPath[]` (from `collectLeavesWithPaths`) and an
 * optional `productCounts` map so empty categories are filtered out and
 * the option label can show "· 12 productos".
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CategorySelector } from "@/components/filters/CategorySelector";
import type { LeafWithPath } from "@/lib/utils/collect-leaves-with-paths";

function makeLeaf(id: string, name: string, path: string[] = []): LeafWithPath {
  return {
    leaf: {
      id,
      name,
      slug: id,
      attribute_schema: {},
      attribute_groups: [],
      presentation: null,
      filter_fields: [],
      children: [],
    },
    path,
  };
}

describe("CategorySelector — leaves + counts", () => {
  it("auto-selects when exactly one leaf has products and value is null", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 3 }}
      />,
    );
    expect(onChange).toHaveBeenCalledWith("c1");
  });

  it("does not auto-select when more than one leaf has products", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos"), makeLeaf("c2", "Bicis")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 3, c2: 1 }}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not re-trigger onChange when a value is already set", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos")]}
        value="c1"
        onChange={onChange}
        productCounts={{ c1: 3 }}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the empty-state message when no leaf has products", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos"), makeLeaf("c2", "Bicis")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 0, c2: 0 }}
      />,
    );
    expect(screen.getByTestId("category-selector-empty")).toHaveTextContent(
      /No hay categorías con productos/i,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("filters out leaves with zero products but keeps leaves with products", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Vacía"), makeLeaf("c2", "Con stock")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 0, c2: 4 }}
      />,
    );
    // Only the leaf with stock is offered in the dropdown.
    expect(
      screen.getByRole("option", { name: /Con stock/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Vacía/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the option label as breadcrumb / leaf name + 'N productos'", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[
          makeLeaf("c1", "Carros y Camionetas", ["Vehículos Terrestres"]),
        ]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 12 }}
      />,
    );
    expect(
      screen.getByRole("option", {
        name: "Vehículos Terrestres / Carros y Camionetas · 12 productos",
      }),
    ).toBeInTheDocument();
  });

  it("renders singular 'producto' when the count is exactly 1", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 1 }}
      />,
    );
    // Single leaf → auto-select fires; label is still rendered as the
    // selected option's text.
    const select = screen.getByRole("combobox");
    expect(select).toHaveTextContent("Motos · 1 producto");
  });

  it("renders just the leaf name (no breadcrumb) when the path is empty", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos")]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 5 }}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "Motos · 5 productos",
    );
  });

  it("lets the user pick a leaf from the visible options", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelector
        leaves={[
          makeLeaf("c1", "Carros", ["Terrestres"]),
          makeLeaf("c2", "Motos"),
        ]}
        value={null}
        onChange={onChange}
        productCounts={{ c1: 2, c2: 5 }}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "c2");

    expect(onChange).toHaveBeenCalledWith("c2");
  });

  it("renders every leaf when no productCounts are provided (back-compat)", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        leaves={[makeLeaf("c1", "Motos"), makeLeaf("c2", "Bicis")]}
        value={null}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("option", { name: /^Motos/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^Bicis/ })).toBeInTheDocument();
  });
});
