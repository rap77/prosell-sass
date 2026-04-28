"use client";

import { formatDistanceToNow } from "date-fns";
import { Lead, LeadStatus } from "@/lib/api/leads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadStatusDropdown } from "./LeadStatusDropdown";
import { User, Mail, Phone, MessageSquare } from "lucide-react";

interface LeadListItemProps {
  lead: Lead;
  onStatusUpdate?: (leadId: string, newStatus: LeadStatus) => void;
  isUnread?: boolean;
}

/**
 * LeadListItem - Single lead row component
 *
 * Displays key lead information in a compact row format:
 * - Buyer info (name, email, phone)
 * - Vehicle details
 * - Message preview
 * - Status badge (with dropdown for quick updates)
 * - Unread highlight (if created < 5 min ago)
 */
export function LeadListItem({ lead, onStatusUpdate, isUnread = false }: LeadListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(lead.created_at), { addSuffix: true });

  return (
    <div
      data-testid="lead-item"
      className={`flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors ${
        isUnread ? "bg-blue-50/50 border-l-4 border-l-blue-500" : ""
      }`}
    >
      {/* Buyer Info */}
      <div className="flex-shrink-0 w-48">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{lead.buyer_name}</span>
        </div>
        {lead.buyer_email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.buyer_email}</span>
          </div>
        )}
        {lead.buyer_phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Phone className="h-3 w-3" />
            <span>{lead.buyer_phone}</span>
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="flex-shrink-0 w-48">
        {lead.vehicle ? (
          <div>
            <div className="font-medium">{lead.vehicle.title}</div>
            <div className="text-sm text-muted-foreground">
              {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">No vehicle</span>
        )}
      </div>

      {/* Message Preview */}
      <div className="flex-1 min-w-0">
        {lead.message ? (
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground line-clamp-2">{lead.message}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground italic">No message</span>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <LeadStatusDropdown
          leadId={lead.id}
          currentStatus={lead.status}
          onStatusUpdated={(newStatus) => onStatusUpdate?.(lead.id, newStatus)}
        />
      </div>

      {/* Time */}
      <div className="flex-shrink-0 w-24 text-right">
        <div className="text-sm text-muted-foreground">{timeAgo}</div>
        <div className="text-xs text-muted-foreground">via {lead.source}</div>
      </div>
    </div>
  );
}
