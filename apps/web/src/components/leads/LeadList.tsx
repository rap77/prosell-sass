"use client";

/**
 * LeadList — ProSell-styled leads table with search, status filter pills,
 * real-time polling (30s), pagination and manual refresh.
 * Tailwind CSS 4 semantic classes.
 */

import { useEffect, useState } from "react";
import { Lead, LeadStatus, useLeads } from "@/lib/api/leads";
import { LeadListItem } from "./LeadListItem";
import { RefreshTrigger } from "@/components/ui/RefreshTrigger";
import { Search, RefreshCw, Users } from "lucide-react";

// ─── Status filter config ─────────────────────────────────────────────────────

const STATUS_FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: LeadStatus.NEW, label: "Nuevos" },
  { value: LeadStatus.CONTACTED, label: "Contactados" },
  { value: LeadStatus.QUALIFIED, label: "Calificados" },
  { value: LeadStatus.APPOINTMENT_SET, label: "Con cita" },
  { value: LeadStatus.LOST, label: "Perdidos" },
];

// ─── Table column headers ─────────────────────────────────────────────────────

const COL_HEADERS = ["Comprador", "Vehículo", "Mensaje", "Estado", "Hora"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadListProps {
  vendedorId?: string;
  onLeadClick?: (leadId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadList({ vendedorId, onLeadClick }: LeadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [isManualRefetch, setIsManualRefetch] = useState(false);
  const limit = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filters: {
    status?: LeadStatus;
    search?: string;
    vendedor_id?: string;
  } = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (debouncedSearch) filters.search = debouncedSearch;
  if (vendedorId) filters.vendedor_id = vendedorId;

  const {
    data: leads = [],
    isLoading,
    error,
    refetch,
  } = useLeads(filters, limit, page * limit);

  const [unreadThreshold] = useState<Date>(
    () => new Date(Date.now() - 5 * 60 * 1000),
  );
  const isUnread = (lead: Lead) => new Date(lead.created_at) > unreadThreshold;

  const handleRefresh = async () => {
    setIsManualRefetch(true);
    await refetch();
    setTimeout(() => setIsManualRefetch(false), 500);
  };

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="m-0 text-sm text-ps-error">
          Error al cargar leads: {error.message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-9 px-4 text-sm font-semibold rounded-lg cursor-pointer bg-ps-cyan text-ps-base"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <RefreshTrigger onRefresh={handleRefresh}>
      <div className="flex flex-col gap-4">
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div
            className="relative flex-1 max-w-xs"
            style={{ minWidth: "220px" }}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex text-ps-tertiary">
              <Search size={14} strokeWidth={2} />
            </span>
            <input
              type="text"
              placeholder="Buscar por comprador o vehículo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg outline-none bg-ps-input-bg border border-ps-input-border text-foreground focus:border-ps-cyan focus:shadow-input-focus"
            />
          </div>

          {/* Status pills */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => {
              const active = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(0);
                  }}
                  className={`h-[30px] px-3 text-xs rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    active
                      ? "font-semibold bg-ps-badge border-ps-border-active text-ps-cyan"
                      : "font-normal bg-transparent border-ps-input-border text-ps-text-secondary"
                  } border`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            data-testid="refresh-button"
            className="w-9 h-9 inline-flex items-center justify-center bg-transparent rounded-lg cursor-pointer transition-all duration-150 border border-ps-input-border text-ps-text-secondary hover:border-ps-border-strong hover:text-foreground"
            title="Actualizar"
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              style={{
                animation:
                  isLoading || isManualRefetch
                    ? "spin 0.8s linear infinite"
                    : "none",
              }}
            />
          </button>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div
          data-testid="lead-list"
          className="rounded-xl overflow-hidden bg-card border border-border"
        >
          {/* Column headers */}
          <div
            className="grid gap-4 p-5 bg-muted border-b border-ps-border-subtle"
            style={{
              gridTemplateColumns: "36px 180px 170px 1fr auto auto",
            }}
          >
            <span />
            {COL_HEADERS.map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wide text-ps-tertiary"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Loading */}
          {isLoading && leads.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Cargando leads...
            </div>
          )}

          {/* Empty */}
          {!isLoading && leads.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2.5 p-12 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted border border-border">
                <Users
                  size={22}
                  className="text-ps-tertiary"
                  strokeWidth={1.5}
                />
              </div>
              <p className="m-0 text-sm text-muted-foreground">
                {debouncedSearch || statusFilter !== "all"
                  ? "Sin resultados. Ajustá los filtros."
                  : "No hay leads aún."}
              </p>
            </div>
          )}

          {/* Rows */}
          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => onLeadClick?.(lead.id)}
              style={{
                cursor: onLeadClick ? "pointer" : "default",
              }}
            >
              <LeadListItem
                lead={lead}
                isUnread={isUnread(lead)}
                onStatusUpdate={() => {
                  /* handled by mutation */
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        <div className="flex justify-center items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="h-8 px-3.5 text-sm font-medium rounded-lg bg-transparent border border-ps-input-border text-muted-foreground disabled:text-ps-text-disabled disabled:cursor-not-allowed cursor-pointer"
          >
            ← Anterior
          </button>

          <span className="text-xs px-2 text-muted-foreground">
            Página {page + 1}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={leads.length < limit || isLoading}
            className="h-8 px-3.5 text-sm font-medium rounded-lg bg-transparent border border-ps-input-border text-muted-foreground disabled:text-ps-text-disabled disabled:cursor-not-allowed cursor-pointer"
          >
            Siguiente →
          </button>
        </div>

        {/* Spinner keyframe */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </RefreshTrigger>
  );
}
