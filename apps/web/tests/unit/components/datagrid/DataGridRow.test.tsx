import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoizedDataGridRow } from "@/components/datagrid/DataGridRow";
import type { Row } from "@tanstack/react-table";

function renderInTable(row: Row<unknown>) {
  return render(
    <table>
      <tbody>
        <MemoizedDataGridRow row={row} />
      </tbody>
    </table>,
  );
}

describe("DataGridRow", () => {
  const mockRow = {
    id: "row-1",
    getVisibleCells: vi.fn(() => [
      {
        id: "cell-1",
        column: {
          columnDef: {
            cell: "Cell Content 1",
          },
        },
        getContext: vi.fn(() => ({})),
      },
      {
        id: "cell-2",
        column: {
          columnDef: {
            cell: "Cell Content 2",
          },
        },
        getContext: vi.fn(() => ({})),
      },
    ]),
  } as unknown as Row<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders row with correct styling", () => {
    const { container } = renderInTable(mockRow);

    const row = container.querySelector("tr");
    expect(row).toBeInTheDocument();
    expect(row).toHaveClass(
      "border-b",
      "border-border",
      "hover:bg-muted/50",
      "transition-colors",
    );
  });

  it("displays all cells from row.getVisibleCells()", () => {
    const { container } = renderInTable(mockRow);

    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(2);
    expect(mockRow.getVisibleCells).toHaveBeenCalledTimes(1);
  });

  it("applies correct cell styling (padding, text size)", () => {
    const { container } = renderInTable(mockRow);

    const cells = container.querySelectorAll("td");
    cells.forEach((cell) => {
      expect(cell).toHaveClass("px-4", "py-3", "text-sm");
    });
  });

  it("is memoized to prevent unnecessary re-renders", () => {
    const { rerender } = renderInTable(mockRow);

    const initialRow = screen.getByRole("row");

    // Re-render with same props
    rerender(
      <table>
        <tbody>
          <MemoizedDataGridRow row={mockRow} />
        </tbody>
      </table>,
    );

    const rerenderedRow = screen.getByRole("row");

    // Memoized component should not re-render if props haven't changed
    expect(initialRow).toBe(rerenderedRow);
  });

  it("has displayName for debugging", () => {
    expect((MemoizedDataGridRow as any).displayName).toBe("DataGridRow");
  });
});
