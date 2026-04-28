"use client";

import { LeadList } from "@/components/leads";
import { useRouter } from "next/navigation";

export default function VendedorLeadsPage() {
  const router = useRouter();

  const handleLeadClick = (leadId: string) => {
    // Navigate to lead details page (to be implemented in A4)
    router.push(`/vendedor/leads/${leadId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Manage your leads and track their status
        </p>
      </div>

      <LeadList onLeadClick={handleLeadClick} />
    </div>
  );
}
