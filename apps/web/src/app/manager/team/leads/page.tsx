"use client";

import { LeadList } from "@/components/leads/LeadList";

/**
 * Manager Team Leads Page
 *
 * Shows all leads across the team for managers.
 * Managers can view, search, and filter all team leads,
 * but cannot reassign leads (that's done via the lead details page).
 */
export default function ManagerTeamLeadsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Team Leads</h1>
        <p className="text-muted-foreground">
          View and manage all leads across your team
        </p>
      </div>

      <LeadList
        // Don't pass vendedorId - show ALL team leads
        onLeadClick={(leadId) => {
          // Navigate to lead details page
          window.location.href = `/manager/leads/${leadId}`;
        }}
      />
    </div>
  );
}
