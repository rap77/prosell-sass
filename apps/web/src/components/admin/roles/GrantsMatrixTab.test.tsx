/**
 * GrantsMatrixTab — bloque 3, item 3.5 ("Permisos" tab). Pure controlled
 * component: renders the zone×action matrix grouped by UI_SECTIONS,
 * reports toggles up via onChange. No pre-disabling by the actor's own
 * grants (no endpoint exposes those yet, see workbook) — the real
 * anti-escalation guard still fires server-side on save.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GrantsMatrixTab } from "./GrantsMatrixTab";
import type { RoleGrant } from "@/lib/api/schemas/roles";

describe("GrantsMatrixTab", () => {
  it("renders every UI section with its zones' actions", () => {
    render(<GrantsMatrixTab grants={[]} onChange={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Catálogo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Concesionarios" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByLabelText("catalog:create")).toBeInTheDocument();
    expect(screen.getByLabelText("roles:delete")).toBeInTheDocument();
    expect(screen.getByLabelText("analytics:export")).toBeInTheDocument();
  });

  it("shows a granted (zone, action) as checked", () => {
    const grants: RoleGrant[] = [{ zone: "catalog", action: "read" }];
    render(<GrantsMatrixTab grants={grants} onChange={vi.fn()} />);

    expect(screen.getByLabelText("catalog:read")).toBeChecked();
    expect(screen.getByLabelText("catalog:create")).not.toBeChecked();
  });

  it("adds the grant when an unchecked checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GrantsMatrixTab grants={[]} onChange={onChange} />);

    await user.click(screen.getByLabelText("catalog:read"));

    expect(onChange).toHaveBeenCalledWith([
      { zone: "catalog", action: "read" },
    ]);
  });

  it("removes the grant when a checked checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const grants: RoleGrant[] = [
      { zone: "catalog", action: "read" },
      { zone: "catalog", action: "update" },
    ];
    render(<GrantsMatrixTab grants={grants} onChange={onChange} />);

    await user.click(screen.getByLabelText("catalog:read"));

    expect(onChange).toHaveBeenCalledWith([
      { zone: "catalog", action: "update" },
    ]);
  });
});
