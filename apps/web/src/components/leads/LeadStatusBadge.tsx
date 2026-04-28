"use client";

import { LeadStatus } from "@/lib/api/leads";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

/**
 * LeadStatusBadge - Displays lead status with color coding
 *
 * Maps the 5-state lead lifecycle to visual badges:
 * - new: Blue (fresh lead)
 * - contacted: Yellow (in progress)
 * - qualified: Green (potential buyer)
 * - appointment_set: Purple (scheduled)
 * - lost: Gray (no longer interested)
 */
export function LeadStatusBadge({ status, className = "" }: LeadStatusBadgeProps) {
  const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
    [LeadStatus.NEW]: {
      label: "New",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    [LeadStatus.CONTACTED]: {
      label: "Contacted",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    [LeadStatus.QUALIFIED]: {
      label: "Qualified",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    [LeadStatus.APPOINTMENT_SET]: {
      label: "Appointment Set",
      className: "bg-purple-100 text-purple-800 border-purple-200",
    },
    [LeadStatus.LOST]: {
      label: "Lost",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
