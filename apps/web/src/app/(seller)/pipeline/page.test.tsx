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

    const header = container.querySelector(".flex.justify-between");
    expect(header).toBeTruthy();
    expect(header?.className).toContain("flex-col");
    expect(header?.className).toContain("md:flex-row");
    expect(header?.className).toContain("md:items-start");
    expect(header?.className).toContain("gap-4");
  });

  it("should render KanbanBoard component", () => {
    const { getByTestId } = render(<PipelinePage />);
    expect(getByTestId("kanban-board")).toBeTruthy();
  });
});
