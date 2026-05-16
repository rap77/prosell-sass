"use client";

import { useState, use } from "react";
import { useLead, useLeadDuplicates, useLeadAuditTrail } from "@/lib/api/leads";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { DuplicateWarning } from "@/components/leads/DuplicateWarning";
import { LeadAuditTrail } from "@/components/leads/LeadAuditTrail";

interface LeadDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * LeadDetails page - Displays detailed information about a single lead
 *
 * Route: /vendedor/leads/{id}
 * Features:
 * - Fetch lead details from GET /api/v1/leads/{id}
 * - Display lead information (name, email, phone, status, source, created_at)
 * - Show vehicle interest if available
 * - Show audit trail of status changes (LeadAuditTrail component)
 * - Responsive design with TailwindCSS
 * - Loading and error states
 * - Back button to return to leads list
 */
export default function LeadDetailsPage({ params }: LeadDetailsPageProps) {
  // Unwrap params promise (Next.js 16 requirement)
  const { id } = use(params);

  const router = useRouter();
  const { data: lead, isLoading, error } = useLead(id);
  const { data: duplicatesData } = useLeadDuplicates(id);
  const {
    data: auditLogs = [],
    isLoading: isAuditLoading,
    error: auditError,
  } = useLeadAuditTrail(id);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading lead details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-red-600 mb-4">Error loading lead: {error.message}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!lead) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Lead not found</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Success state - render lead details
  return (
    <div className="container mx-auto py-8">
      {/* Header with back button */}
      <div className="mb-6">
        <Button onClick={() => router.back()} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>

        <h1 className="text-3xl font-bold">Lead Details</h1>
        <p className="text-muted-foreground">View and manage lead information</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <Button onClick={() => setIsAppointmentModalOpen(true)} size="lg">
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Cita
        </Button>
      </div>

      {/* Duplicate warning — shown when potential duplicates are detected */}
      {duplicatesData && duplicatesData.count > 0 && (
        <DuplicateWarning
          duplicates={duplicatesData.duplicates}
          onLeadClick={(leadId) => router.push(`/vendedor/leads/${leadId}`)}
          className="max-w-4xl mb-6"
        />
      )}

      {/* Lead details card */}
      <div className="max-w-4xl space-y-6">
        <div className="border rounded-lg p-6 space-y-6">
          {/* Buyer Information */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Buyer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-medium">{lead.buyer_name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium">{lead.buyer_email || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <p className="font-medium">{lead.buyer_phone || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Source</label>
                <p className="font-medium capitalize">{lead.source}</p>
              </div>
            </div>
          </div>

          {/* Product Interest */}
          {lead.product && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Vehicle Interest</h2>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{lead.product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.product.attributes.year} {lead.product.attributes.make}{" "}
                  {lead.product.attributes.model}
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Message</h2>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{lead.message}</p>
              </div>
            </div>
          )}

          {/* Timeline Information */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Timeline</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <p className="font-medium">{new Date(lead.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <p className="font-medium">{new Date(lead.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail — status change history */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Status History</h2>
          <LeadAuditTrail
            auditLogs={auditLogs}
            isLoading={isAuditLoading}
            error={auditError}
          />
        </div>
      </div>

      {/* Appointment Form Modal */}
      <AppointmentForm
        open={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSuccess={() => {
          // Refresh lead data after appointment is created
          // (handled by query invalidation in the mutation)
          setIsAppointmentModalOpen(false);
        }}
        leadId={lead.id}
        vehicleId={lead.product?.id || null}
      />
    </div>
  );
}
