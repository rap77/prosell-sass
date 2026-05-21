/**
 * Component tests for LeadAuditTrail
 *
 * Verifies:
 * - Loading state renders spinner
 * - Error state renders error message
 * - Empty state renders empty message
 * - Audit entries render in order (newest-first)
 * - Status transitions (old → new) are displayed
 * - Timestamps are rendered for each entry
 * - Who made the change (changed_by_user_id) is shown
 * - Reason for change is shown when present
 * - Reason is hidden when absent
 * - Accessibility: section label, sr-only text
 */
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LeadAuditTrail } from "./LeadAuditTrail";
import { LeadStatus, type LeadAuditLogEntry } from "@/lib/api/leads";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<LeadAuditLogEntry> = {}): LeadAuditLogEntry => ({
  id: "11111111-0000-0000-0000-000000000001",
  lead_id: "22222222-0000-0000-0000-000000000002",
  old_status: LeadStatus.NEW,
  new_status: LeadStatus.CONTACTED,
  changed_by_user_id: "33333333-0000-0000-0000-000000000003",
  reason: "Called the buyer",
  created_at: "2026-05-16T10:00:00.000Z",
  ...overrides,
});

const entryNewest: LeadAuditLogEntry = makeEntry({
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  old_status: LeadStatus.CONTACTED,
  new_status: LeadStatus.QUALIFIED,
  created_at: "2026-05-16T15:00:00.000Z",
  reason: "Very interested buyer",
});

const entryOlder: LeadAuditLogEntry = makeEntry({
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  old_status: LeadStatus.NEW,
  new_status: LeadStatus.CONTACTED,
  created_at: "2026-05-16T10:00:00.000Z",
  reason: "Initial contact made",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("LeadAuditTrail", () => {
  describe("loading state", () => {
    it("renders spinner when isLoading is true", () => {
      render(<LeadAuditTrail auditLogs={[]} isLoading={true} />);
      expect(screen.getByTestId("audit-loading")).toBeInTheDocument();
      expect(screen.getByText(/loading audit history/i)).toBeInTheDocument();
    });

    it("does not render the trail list while loading", () => {
      render(<LeadAuditTrail auditLogs={[]} isLoading={true} />);
      expect(screen.queryByTestId("audit-trail-list")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("renders error message when error is provided", () => {
      const err = new Error("Network error");
      render(<LeadAuditTrail auditLogs={[]} error={err} />);
      const errorEl = screen.getByTestId("audit-error");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveAttribute("role", "alert");
      expect(errorEl).toHaveTextContent("Network error");
    });

    it("does not render the trail list when error is present", () => {
      const err = new Error("Oops");
      render(<LeadAuditTrail auditLogs={[]} error={err} />);
      expect(screen.queryByTestId("audit-trail-list")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders empty message when auditLogs is empty", () => {
      render(<LeadAuditTrail auditLogs={[]} />);
      expect(screen.getByTestId("audit-empty")).toBeInTheDocument();
      expect(
        screen.getByText(/no status changes recorded yet/i)
      ).toBeInTheDocument();
    });

    it("does not render the trail list when empty", () => {
      render(<LeadAuditTrail auditLogs={[]} />);
      expect(screen.queryByTestId("audit-trail-list")).not.toBeInTheDocument();
    });
  });

  describe("single entry", () => {
    it("renders the trail list", () => {
      const entry = makeEntry();
      render(<LeadAuditTrail auditLogs={[entry]} />);
      expect(screen.getByTestId("audit-trail-list")).toBeInTheDocument();
    });

    it("renders exactly one audit entry", () => {
      const entry = makeEntry();
      render(<LeadAuditTrail auditLogs={[entry]} />);
      expect(screen.getAllByTestId("audit-entry")).toHaveLength(1);
    });

    it("renders the timestamp for the entry", () => {
      const entry = makeEntry({ created_at: "2026-05-16T10:00:00.000Z" });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      const timestamp = screen.getByTestId("audit-timestamp");
      expect(timestamp).toBeInTheDocument();
      // dateTime attribute matches the ISO string
      expect(timestamp).toHaveAttribute("dateTime", "2026-05-16T10:00:00.000Z");
    });

    it("renders the status change badges", () => {
      const entry = makeEntry({
        old_status: LeadStatus.NEW,
        new_status: LeadStatus.CONTACTED,
      });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      const statusChange = screen.getByTestId("audit-status-change");
      const badges = within(statusChange).getAllByTestId("status-badge");
      // Two badges: old and new status
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent("Nuevo");
      expect(badges[1]).toHaveTextContent("Contactado");
    });

    it("renders who made the change", () => {
      const entry = makeEntry({
        changed_by_user_id: "33333333-0000-0000-0000-000000000003",
      });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      const changedBy = screen.getByTestId("audit-changed-by");
      expect(changedBy).toBeInTheDocument();
      expect(changedBy).toHaveTextContent("33333333-0000-0000-0000-000000000003");
    });

    it("hides the changed-by section when changed_by_user_id is null", () => {
      const entry = makeEntry({ changed_by_user_id: null });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      expect(screen.queryByTestId("audit-changed-by")).not.toBeInTheDocument();
    });

    it("renders the reason when provided", () => {
      const entry = makeEntry({ reason: "Buyer agreed to schedule" });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      const reason = screen.getByTestId("audit-reason");
      expect(reason).toBeInTheDocument();
      expect(reason).toHaveTextContent("Buyer agreed to schedule");
    });

    it("hides the reason section when reason is null", () => {
      const entry = makeEntry({ reason: null });
      render(<LeadAuditTrail auditLogs={[entry]} />);
      expect(screen.queryByTestId("audit-reason")).not.toBeInTheDocument();
    });
  });

  describe("multiple entries", () => {
    it("renders all entries in order (newest first as provided)", () => {
      // Backend provides newest-first; component must render in that order
      render(<LeadAuditTrail auditLogs={[entryNewest, entryOlder]} />);
      const entries = screen.getAllByTestId("audit-entry");
      expect(entries).toHaveLength(2);
      // First entry should have the newest timestamp
      const firstTimestamp = within(entries[0]).getByTestId("audit-timestamp");
      expect(firstTimestamp).toHaveAttribute("dateTime", "2026-05-16T15:00:00.000Z");
      // Second entry should have the older timestamp
      const secondTimestamp = within(entries[1]).getByTestId("audit-timestamp");
      expect(secondTimestamp).toHaveAttribute("dateTime", "2026-05-16T10:00:00.000Z");
    });

    it("renders correct status changes for each entry", () => {
      render(<LeadAuditTrail auditLogs={[entryNewest, entryOlder]} />);
      const entries = screen.getAllByTestId("audit-entry");

      // First (newest): contacted → qualified
      const newestBadges = within(entries[0]).getAllByTestId("status-badge");
      expect(newestBadges[0]).toHaveTextContent("Contactado");
      expect(newestBadges[1]).toHaveTextContent("Calificado");

      // Second (older): new → contacted
      const olderBadges = within(entries[1]).getAllByTestId("status-badge");
      expect(olderBadges[0]).toHaveTextContent("Nuevo");
      expect(olderBadges[1]).toHaveTextContent("Contactado");
    });

    it("renders reason for each entry", () => {
      render(<LeadAuditTrail auditLogs={[entryNewest, entryOlder]} />);
      const reasons = screen.getAllByTestId("audit-reason");
      expect(reasons[0]).toHaveTextContent("Very interested buyer");
      expect(reasons[1]).toHaveTextContent("Initial contact made");
    });
  });

  describe("all status transitions", () => {
    const statusPairs: Array<[LeadStatus, LeadStatus, string, string]> = [
      [LeadStatus.NEW, LeadStatus.CONTACTED, "Nuevo", "Contactado"],
      [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, "Contactado", "Calificado"],
      [LeadStatus.QUALIFIED, LeadStatus.APPOINTMENT_SET, "Calificado", "Cita agendada"],
      [LeadStatus.NEW, LeadStatus.LOST, "Nuevo", "Perdido"],
    ];

    statusPairs.forEach(([oldStatus, newStatus, oldLabel, newLabel]) => {
      it(`renders ${oldLabel} → ${newLabel} transition`, () => {
        const entry = makeEntry({ old_status: oldStatus, new_status: newStatus });
        render(<LeadAuditTrail auditLogs={[entry]} />);
        const statusChange = screen.getByTestId("audit-status-change");
        const badges = within(statusChange).getAllByTestId("status-badge");
        expect(badges[0]).toHaveTextContent(oldLabel);
        expect(badges[1]).toHaveTextContent(newLabel);
      });
    });
  });

  describe("accessibility", () => {
    it("has aria-label on the section", () => {
      const entry = makeEntry();
      render(<LeadAuditTrail auditLogs={[entry]} />);
      expect(screen.getByRole("region", { name: /lead audit trail/i })).toBeInTheDocument();
    });

    it("has aria-label on the list reflecting the count", () => {
      render(<LeadAuditTrail auditLogs={[entryNewest, entryOlder]} />);
      const list = screen.getByTestId("audit-trail-list");
      expect(list).toHaveAttribute("aria-label", "2 status changes");
    });

    it("has singular aria-label when only one entry", () => {
      const entry = makeEntry();
      render(<LeadAuditTrail auditLogs={[entry]} />);
      const list = screen.getByTestId("audit-trail-list");
      expect(list).toHaveAttribute("aria-label", "1 status change");
    });

    it("applies custom className to the root section", () => {
      const entry = makeEntry();
      const { container } = render(
        <LeadAuditTrail auditLogs={[entry]} className="custom-audit" />
      );
      // The section is the root element
      const section = container.querySelector("section");
      expect(section).toHaveClass("custom-audit");
    });
  });
});
