/**
 * OrganizationMultiSelectFilter.test.tsx
 *
 * Pure presentational component — no hooks/stores to mock. Verifies the
 * trigger label, the checkbox toggle semantics (add/remove from the
 * selection, never a single-select replace), and the "clear" shortcut.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";
import { OrganizationMultiSelectFilter } from "./OrganizationMultiSelectFilter";

const organizations = [
  { id: "org-1", name: "Organization One" },
  { id: "org-2", name: "Organization Two" },
];

describe("OrganizationMultiSelectFilter", () => {
  it('shows "Organizaciones" as the trigger label when nothing is selected', () => {
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toHaveTextContent("Organizaciones");
  });

  it("shows the organization's own name when exactly one is selected", () => {
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={["org-2"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toHaveTextContent("Organization Two");
  });

  it('shows "N organizaciones" when more than one is selected', () => {
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={["org-1", "org-2"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toHaveTextContent("2 organizaciones");
  });

  it("calls onChange ADDING the clicked organization when none is selected yet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={[]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button"));
    const option = await screen.findByText("Organization One");
    await user.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(["org-1"]);
    });
  });

  it("calls onChange ADDING a second organization without dropping the first", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={["org-1"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button"));
    const option = await screen.findByText("Organization Two");
    await user.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(["org-1", "org-2"]);
    });
  });

  it("calls onChange REMOVING an already-selected organization on a second click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={["org-1", "org-2"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button"));
    const option = await screen.findByText("Organization One");
    await user.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(["org-2"]);
    });
  });

  it('shows a "Limpiar selección" shortcut only when something is selected, clearing to []', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={["org-1"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button"));
    const clear = await screen.findByText("Limpiar selección");
    await user.click(clear);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('does not show "Limpiar selección" when nothing is selected', async () => {
    const user = userEvent.setup();
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(screen.queryByText("Limpiar selección")).not.toBeInTheDocument();
  });

  it("disables the trigger button when disabled=true", () => {
    render(
      <OrganizationMultiSelectFilter
        organizations={organizations}
        selectedIds={[]}
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
