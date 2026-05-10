"use client";

import { useState } from "react";
import { Lead, LeadStatus, useLeads } from "@/lib/api/leads";
import { LeadListItem } from "./LeadListItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";

interface LeadListProps {
  vendedorId?: string;
  onLeadClick?: (leadId: string) => void;
}

/**
 * LeadList - DataGrid pattern for leads
 *
 * Features:
 * - Search by buyer name or vehicle
 * - Filter by status
 * - Highlight unread leads (< 5 min old)
 * - Real-time updates (polling every 30s)
 * - Pagination support
 */
export function LeadList({ vendedorId, onLeadClick }: LeadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [isManualRefetch, setIsManualRefetch] = useState(false);
  const limit = 50;

  // Build filters
  const filters: { status?: LeadStatus; search?: string; vendedor_id?: string } = {};

  if (statusFilter !== "all") {
    filters.status = statusFilter;
  }

  if (searchQuery.trim()) {
    filters.search = searchQuery.trim();
  }

  if (vendedorId) {
    filters.vendedor_id = vendedorId;
  }

  // Fetch leads with real-time updates (30s polling)
  const { data: leads = [], isLoading, error, refetch } = useLeads(
    filters,
    limit,
    page * limit
  );

  // Calculate unread leads (created < 5 minutes ago)
  // Note: Date.now() is called on each render - acceptable overhead for this use case
  const unreadThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const isUnread = (lead: Lead) => {
    return new Date(lead.created_at) > unreadThreshold;
  };

  const handleRefresh = async () => {
    setIsManualRefetch(true);
    await refetch();
    // Reset manual refetch state after a short delay
    setTimeout(() => setIsManualRefetch(false), 500);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Error loading leads: {error.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Get display text for status filter
  const getStatusDisplayText = () => {
    if (statusFilter === "all") return "All Statuses";
    const statusMap: Record<LeadStatus, string> = {
      [LeadStatus.NEW]: "New",
      [LeadStatus.CONTACTED]: "Contacted",
      [LeadStatus.QUALIFIED]: "Qualified",
      [LeadStatus.APPOINTMENT_SET]: "Appointment Set",
      [LeadStatus.LOST]: "Lost",
    };
    return statusMap[statusFilter];
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by buyer name or vehicle..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as LeadStatus | "all")}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue placeholder="Filter by status">
              {getStatusDisplayText()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={LeadStatus.NEW}>New</SelectItem>
            <SelectItem value={LeadStatus.CONTACTED}>Contacted</SelectItem>
            <SelectItem value={LeadStatus.QUALIFIED}>Qualified</SelectItem>
            <SelectItem value={LeadStatus.APPOINTMENT_SET}>Appointment Set</SelectItem>
            <SelectItem value={LeadStatus.LOST}>Lost</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          data-testid="refresh-button"
        >
          <RefreshCw className={`h-4 w-4 ${(isLoading || isManualRefetch) ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Leads List */}
      <div className="border rounded-lg" data-testid="lead-list">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-muted font-medium text-sm border-b">
          <div className="w-48">Buyer</div>
          <div className="w-48">Vehicle</div>
          <div className="flex-1">Message</div>
          <div className="flex-shrink-0">Status</div>
          <div className="w-24 text-right">Time</div>
        </div>

        {/* Loading State */}
        {isLoading && leads.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Loading leads...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && leads.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No leads found. Try adjusting your filters.
          </div>
        )}

        {/* Leads */}
        <div>
          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => onLeadClick?.(lead.id)}
              className={onLeadClick ? "cursor-pointer" : ""}
            >
              <LeadListItem
                lead={lead}
                isUnread={isUnread(lead)}
                onStatusUpdate={() => {
                  // Status update already handled by mutation hook
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination - Always show for E2E testing */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={leads.length < limit || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
