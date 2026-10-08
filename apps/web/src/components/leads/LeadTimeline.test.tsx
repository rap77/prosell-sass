/**
 * LeadTimeline — bloque CRM Fase 4 ("Twenty concept: Activities").
 * Merges LeadAuditLogEntry (status changes) + LeadActivityEntry
 * (manual notes/calls) into one chronological feed, newest first.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeadTimeline } from "./LeadTimeline";
import { LeadStatus } from "@/lib/api/leads";
import { LeadActivityType } from "@/lib/api/schemas/leads";
import type { LeadAuditLogEntry } from "@/lib/api/leads";
import type { LeadActivityEntry } from "@/lib/api/leads";

const AUDIT_LOG: LeadAuditLogEntry = {
  id: "audit-1",
  lead_id: "lead-1",
  old_status: LeadStatus.NEW,
  new_status: LeadStatus.CONTACTED,
  changed_by_user_id: "user-1",
  reason: null,
  created_at: "2026-01-01T10:00:00Z",
};

const NOTE_ACTIVITY: LeadActivityEntry = {
  id: "activity-1",
  lead_id: "lead-1",
  type: LeadActivityType.NOTE,
  content: "Cliente pide fotos adicionales",
  created_by_user_id: "user-1",
  created_at: "2026-01-02T10:00:00Z",
};

const CALL_ACTIVITY: LeadActivityEntry = {
  id: "activity-2",
  lead_id: "lead-1",
  type: LeadActivityType.CALL,
  content: "Primera llamada, muy interesado",
  created_by_user_id: "user-1",
  created_at: "2026-01-03T10:00:00Z",
};

describe("LeadTimeline", () => {
  it("renders both status changes and manual activities", () => {
    render(
      <LeadTimeline
        auditLogs={[AUDIT_LOG]}
        activities={[NOTE_ACTIVITY, CALL_ACTIVITY]}
      />,
    );

    expect(
      screen.getByText("Cliente pide fotos adicionales"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Primera llamada, muy interesado"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("audit-entry")).toBeInTheDocument();
  });

  it("orders merged entries newest first regardless of source", () => {
    render(
      <LeadTimeline
        auditLogs={[AUDIT_LOG]}
        activities={[NOTE_ACTIVITY, CALL_ACTIVITY]}
      />,
    );

    const items = screen.getAllByTestId(/timeline-item/);
    // CALL_ACTIVITY (Jan 3) > NOTE_ACTIVITY (Jan 2) > AUDIT_LOG (Jan 1)
    expect(items[0]).toHaveTextContent("Primera llamada, muy interesado");
    expect(items[1]).toHaveTextContent("Cliente pide fotos adicionales");
    expect(items[2].textContent).toMatch(/Nuevo|Contactado/i);
  });

  it("shows an empty state when there is nothing to show", () => {
    render(<LeadTimeline auditLogs={[]} activities={[]} />);

    expect(screen.getByText(/sin actividad registrada/i)).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    render(<LeadTimeline auditLogs={[]} activities={[]} isLoading />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
});
