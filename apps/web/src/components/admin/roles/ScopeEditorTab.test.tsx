/**
 * ScopeEditorTab — bloque 3, item 3.6 ("Alcance" tab). Pure controlled
 * component: own/explicit/all radio + org checklist for explicit,
 * reusing the already-fetched admin organizations list (useOrganizations,
 * same source OrganizationPicker uses) rather than a new endpoint.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScopeEditorTab } from "./ScopeEditorTab";
import type { RoleScope } from "@/lib/api/schemas/roles";

const mockUseOrganizations = vi.fn();
vi.mock("@/lib/api/organizations", () => ({
  useOrganizations: () => mockUseOrganizations(),
}));

describe("ScopeEditorTab", () => {
  beforeEach(() => {
    mockUseOrganizations.mockReturnValue({
      data: [
        { id: "org-1", name: "AutoMax Rosario" },
        { id: "org-2", name: "Dealer Norte SA" },
      ],
      isLoading: false,
    });
  });

  it("marks the current scope type as selected", () => {
    const scope: RoleScope = { scope_type: "own", organization_ids: [] };
    render(<ScopeEditorTab scope={scope} onChange={vi.fn()} />);

    expect(
      screen.getByRole("radio", { name: /propia organización/i }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /todas las organizaciones/i }),
    ).not.toBeChecked();
  });

  it("changes the scope type on selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope: RoleScope = { scope_type: "own", organization_ids: [] };
    render(<ScopeEditorTab scope={scope} onChange={onChange} />);

    await user.click(
      screen.getByRole("radio", { name: /todas las organizaciones/i }),
    );

    expect(onChange).toHaveBeenCalledWith({
      scope_type: "all",
      organization_ids: [],
    });
  });

  it("shows the org checklist only when scope_type is explicit", () => {
    const scope: RoleScope = { scope_type: "own", organization_ids: [] };
    render(<ScopeEditorTab scope={scope} onChange={vi.fn()} />);

    expect(screen.queryByText("AutoMax Rosario")).not.toBeInTheDocument();
  });

  it("toggles an organization on/off within an explicit scope", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const scope: RoleScope = {
      scope_type: "explicit",
      organization_ids: ["org-1"],
    };
    render(<ScopeEditorTab scope={scope} onChange={onChange} />);

    expect(screen.getByText("AutoMax Rosario")).toBeInTheDocument();

    await user.click(screen.getByText("Dealer Norte SA"));
    expect(onChange).toHaveBeenCalledWith({
      scope_type: "explicit",
      organization_ids: ["org-1", "org-2"],
    });

    await user.click(screen.getByText("AutoMax Rosario"));
    expect(onChange).toHaveBeenCalledWith({
      scope_type: "explicit",
      organization_ids: [],
    });
  });
});
