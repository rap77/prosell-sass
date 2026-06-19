/**
 * CategorySelector — Subsystem B (Task 11).
 *
 * Renders a category picker driven by `OrgVerticalsResponse`'s
 * `CategoryNode[]`, auto-selecting the only category when exactly
 * one exists.
 *
 * Spec: docs/superpowers/specs/2026-06-06-subsystem-b-dynamic-filters-design.md
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CategorySelector } from "@/components/filters/CategorySelector";
import type { CategoryNode } from "@/types/category";

function makeCategory(overrides: Partial<CategoryNode>): CategoryNode {
  return {
    id: "c1",
    name: "Autos",
    slug: "autos",
    attribute_schema: {},
    presentation: null,
    filter_fields: [],
    ...overrides,
  };
}

describe("CategorySelector", () => {
  it("auto-selects when exactly one category", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        categories={[makeCategory({ id: "c1", name: "Autos" })]}
        value={null}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledWith("c1");
  });

  it("does not auto-select when multiple categories exist", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        categories={[
          makeCategory({ id: "c1", name: "Autos" }),
          makeCategory({ id: "c2", name: "Inmuebles" }),
        ]}
        value={null}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not re-trigger onChange when a value is already set", () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        categories={[makeCategory({ id: "c1", name: "Autos" })]}
        value="c1"
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("lets the user pick a category from multiple options", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelector
        categories={[
          makeCategory({ id: "c1", name: "Autos" }),
          makeCategory({ id: "c2", name: "Inmuebles" }),
        ]}
        value={null}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "c2");

    expect(onChange).toHaveBeenCalledWith("c2");
  });
});
