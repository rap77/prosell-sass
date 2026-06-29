import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CategorySelectorModal } from "@/components/forms/CategorySelectorModal";
import type { CategoryNode } from "@/types/category";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

function makeCategory(overrides: Partial<CategoryNode>): CategoryNode {
  return {
    id: "c1",
    name: "Autos",
    slug: "autos",
    attribute_schema: {},
    attribute_groups: [],
    presentation: null,
    filter_fields: [],
    ...overrides,
  };
}

const CATEGORIES: CategoryNode[] = [
  makeCategory({ id: "c1", name: "Autos", slug: "autos" }),
  makeCategory({ id: "c2", name: "Inmuebles", slug: "inmuebles" }),
];

describe("CategorySelectorModal", () => {
  it("renders nothing when closed", () => {
    render(
      <CategorySelectorModal
        open={false}
        onOpenChange={vi.fn()}
        categories={CATEGORIES}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("renders category cards when open", () => {
    render(
      <CategorySelectorModal
        open={true}
        onOpenChange={vi.fn()}
        categories={CATEGORIES}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Autos")).toBeInTheDocument();
    expect(screen.getByText("Inmuebles")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked category", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelectorModal
        open={true}
        onOpenChange={vi.fn()}
        categories={CATEGORIES}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Autos" }));
    expect(onSelect).toHaveBeenCalledWith(CATEGORIES[0]);
  });

  it("calls onOpenChange(false) after selecting a category", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySelectorModal
        open={true}
        onOpenChange={onOpenChange}
        categories={CATEGORIES}
        onSelect={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Autos" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
