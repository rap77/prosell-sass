"use client";

import { useState } from "react";
import { LeadStatus, useUpdateLeadStatus } from "@/lib/api/leads";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { ChevronDown } from "lucide-react";

interface LeadStatusDropdownProps {
  leadId: string;
  currentStatus: LeadStatus;
  onStatusUpdated?: (newStatus: LeadStatus) => void;
}

/**
 * LeadStatusDropdown - Quick status update dropdown
 *
 * Allows vendedores to quickly update lead status without navigating away.
 * Shows current status badge and dropdown with available status transitions.
 */
export function LeadStatusDropdown({
  leadId,
  currentStatus,
  onStatusUpdated,
}: LeadStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLeadStatus = useUpdateLeadStatus(leadId);

  // All available statuses (backend will validate state transitions)
  const availableStatuses: LeadStatus[] = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.APPOINTMENT_SET,
    LeadStatus.LOST,
  ];

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      await updateLeadStatus.mutateAsync({ status: newStatus });
      onStatusUpdated?.(newStatus);
      setIsOpen(false);
    } catch (error) {
      // Error toast is already shown by the mutation hook
      console.error("Failed to update lead status:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          disabled={updateLeadStatus.isPending}
        >
          <LeadStatusBadge status={currentStatus} />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus || updateLeadStatus.isPending}
          >
            <LeadStatusBadge status={status} className="mr-2" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
