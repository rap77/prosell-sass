import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PipelinePage from "./page";

// Mock KanbanBoardIsland component
vi.mock("@/components/pipeline/KanbanBoardIsland", () => ({
  KanbanBoardIsland: () => <div data-testid="kanban-board">Kanban Board</div>,
}));

describe("PipelinePage - Mobile-First", () => {
  it("header should be responsive: flex-col md:flex-row", () => {
    const { container } = render(<PipelinePage />);

    const header = container.querySelector(
      ".flex.items-start.justify-between.gap-4",
    );
    expect(header).toBeTruthy();
    expect(
      header?.className.includes("flex-col") &&
        header?.className.includes("md:flex-row"),
    ).toBe(true);
  });

  it("should render KanbanBoard component", () => {
    const { getByTestId } = render(<PipelinePage />);
    expect(getByTestId("kanban-board")).toBeTruthy();
  });
});
