"use client";

import { useState, useMemo } from "react";
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
import { Search, RefreshCw, Download } from "lucide-react";
import { useVendedores } from "@/lib/api/vendedores";

interface TeamLeadListProps {
  onLeadClick?: (leadId: string) => void;
  onReassignLead?: (leadId: string) => void;
}

/**
 * TeamLeadList - Extended LeadList for managers
 *
 * Features:
 * - View all leads across team (not just own)
 * - Filter by vendedor dropdown
 * - Search by buyer name or vehicle
 * - Filter by status
 * - Highlight unread leads (< 5 min old)
 * - Real-time updates (polling every 30s)
 * - Pagination support
 * - Export to CSV button
 */
export function TeamLeadList({ onLeadClick, onReassignLead }: TeamLeadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [vendedorFilter, setVendedorFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [isManualRefetch, setIsManualRefetch] = useState(false);
  const limit = 50;

  // Fetch vendedores for filter dropdown
  const { data: vendedores = [] } = useVendedores();

  // Build filters
  const filters = useMemo(() => {
    const result: { status?: LeadStatus; search?: string; vendedor_id?: string } = {};

    if (statusFilter !== "all") {
      result.status = statusFilter;
    }

    if (searchQuery.trim()) {
      result.search = searchQuery.trim();
    }

    // Manager scope: filter by vendedor if selected
    // If "all", backend returns all team leads (no vendedor_id filter)
    if (vendedorFilter !== "all") {
      result.vendedor_id = vendedorFilter;
    }

    return result;
  }, [searchQuery, statusFilter, vendedorFilter]);

  // Fetch leads with real-time updates (30s polling)
  const { data: leads = [], isLoading, error, refetch } = useLeads(
    filters,
    limit,
    page * limit
  );

  // Calculate unread leads (created < 5 minutes ago)
  const unreadThreshold = useMemo(() => {
    return new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  }, []);

  const isUnread = (lead: Lead) => {
    return new Date(lead.created_at) > unreadThreshold;
  };

  const handleRefresh = async () => {
    setIsManualRefetch(true);
    await refetch();
    // Reset manual refetch state after a short delay
    setTimeout(() => setIsManualRefetch(false), 500);
  };

  const handleExportToCSV = () => {
    // CSV header
    const headers = ["Buyer Name", "Email", "Phone", "Vehicle", "Status", "Source", "Created At"];

    /**
     * Escape CSV field to prevent CSV injection attacks.
     * If a field starts with =, -, +, or @, prepend a single quote to prevent Excel from executing it as a formula.
     * @see https://owasp.org/www-community/attacks/CSV_Injection
     */
    const escapeCsvField = (field: string): string => {
      if (!field) return "";
      const trimmed = field.trim();
      if (/^[=+\-@]/.test(trimmed)) {
        return `'${trimmed}`;
      }
      return trimmed;
    };

    // Convert leads to CSV rows
    const rows = leads.map((lead) => [
      escapeCsvField(lead.buyer_name),
      escapeCsvField(lead.buyer_email || ""),
      escapeCsvField(lead.buyer_phone || ""),
      escapeCsvField(lead.vehicle?.title || "N/A"),
      escapeCsvField(lead.status),
      escapeCsvField(lead.source),
      escapeCsvField(lead.created_at),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-leads-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
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

  // Get display text for vendedor filter
  const getVendedorDisplayText = () => {
    if (vendedorFilter === "all") return "All Vendedores";
    const vendedor = vendedores.find((v) => v.id === vendedorFilter);
    return vendedor?.name || "Unknown";
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
            data-testid="search-input"
          />
        </div>

        {/* Vendedor Filter */}
        <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
          <SelectTrigger className="w-48" data-testid="vendedor-filter">
            <SelectValue placeholder="Filter by vendedor">
              {getVendedorDisplayText()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendedores</SelectItem>
            {vendedores.map((vendedor) => (
              <SelectItem key={vendedor.id} value={vendedor.id}>
                {vendedor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {/* Export to CSV Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportToCSV}
          disabled={leads.length === 0}
          data-testid="export-csv-button"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>

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
      <div className="border rounded-lg" data-testid="team-lead-list">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-muted font-medium text-sm border-b">
          <div className="w-48">Buyer</div>
          <div className="w-48">Vehicle</div>
          <div className="flex-1">Message</div>
          <div className="flex-shrink-0">Status</div>
          <div className="w-24 text-right">Time</div>
          {onReassignLead && <div className="w-24">Actions</div>}
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
                onStatusUpdate={(leadId, newStatus) => {
                  // Status update already handled by mutation hook
                  console.log(`Lead ${leadId} status updated to ${newStatus}`);
                }}
                actions={
                  onReassignLead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReassignLead(lead.id);
                      }}
                      data-testid={`reassign-${lead.id}`}
                    >
                      Reassign
                    </Button>
                  ) : undefined
                }
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
          data-testid="previous-page"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={leads.length < limit || isLoading}
          data-testid="next-page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
