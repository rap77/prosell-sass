"use client";

/**
 * Manager › Team Leads — ProSell team lead overview.
 *
 * Shows all leads across the team (no vendedor_id filter).
 * Managers can view, search, and filter — reassignment is via lead detail.
 *
 * All colors via var(--ps-*) tokens.
 */

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { LeadList } from "@/components/leads/LeadList";

export default function ManagerTeamLeadsPage() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ps-text-primary)",
              lineHeight: 1.2,
            }}
          >
            Leads del equipo
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ps-text-secondary)",
            }}
          >
            Supervisión de todos los leads activos asignados al equipo.
          </p>
        </div>

        {/* Team badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 14px",
            borderRadius: 99,
            background: "rgba(77,184,255,0.08)",
            border: "1px solid rgba(77,184,255,0.15)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ps-cyan)",
            flexShrink: 0,
          }}
        >
          <Users size={13} strokeWidth={2} />
          Vista de manager
        </div>
      </div>

      {/* Lead list — no vendedorId filter, shows all team leads */}
      <LeadList
        onLeadClick={(leadId) => router.push(`/manager/leads/${leadId}`)}
      />
    </div>
  );
}
