"use client";

import { useState } from "react";
import { TeamMetricsCard } from "@/components/leads/TeamMetricsCard";
import { TeamLeadList } from "@/components/leads/TeamLeadList";
import { LeadReassignModal } from "@/components/leads/LeadReassignModal";
import { useRouter } from "next/navigation";
import { useLead } from "@/lib/api/leads";

/**
 * Manager Team Leads Page
 *
 * Displays:
 * 1. Team performance metrics (TeamMetricsCard)
 * 2. All leads across the team (TeamLeadList)
 * 3. Lead reassignment functionality (LeadReassignModal)
 *
 * Role: Manager - can view all team leads and reassign them
 */
export default function ManagerTeamLeadsPage() {
  const router = useRouter();
  const [reassignLeadId, setReassignLeadId] = useState<string | null>(null);

  // Fetch lead data when reassignLeadId is set
  const { data: lead } = useLead(reassignLeadId || "", {
    enabled: !!reassignLeadId,
  });

  const handleLeadClick = (leadId: string) => {
    // Navigate to lead details page
    router.push(`/manager/team/leads/${leadId}`);
  };

  const handleReassignLead = (leadId: string) => {
    setReassignLeadId(leadId);
  };

  const handleCloseReassignModal = () => {
    setReassignLeadId(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Team Leads</h1>
        <p className="text-muted-foreground">
          View and manage all leads across your team
        </p>
      </div>

      {/* Team Metrics */}
      <section>
        <TeamMetricsCard />
      </section>

      {/* Team Leads List */}
      <section>
        <TeamLeadList
          onLeadClick={handleLeadClick}
          onReassignLead={handleReassignLead}
        />
      </section>

      {/* Lead Reassignment Modal */}
      <LeadReassignModal
        lead={lead || null}
        open={!!reassignLeadId}
        onClose={handleCloseReassignModal}
        onSuccess={() => {
          // Refresh or update state after successful reassignment
          setReassignLeadId(null);
        }}
      />
    </div>
  );
}
