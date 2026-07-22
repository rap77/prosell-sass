"use client";

/**
 * LeadList — ProSell-styled leads table with search, status filter pills,
 * real-time polling (30s), pagination and manual refresh.
 * All colors via var(--ps-*) tokens.
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
        <p className="m-0 text-sm" style={{ color: "var(--ps-error)" }}>
          Error al cargar leads: {error.message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-9 px-4 text-sm font-semibold text-white rounded-lg cursor-pointer"
          style={{
            background: "var(--ps-cyan)",
            color: "var(--ps-bg-base)",
          }}
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
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex"
              style={{ color: "var(--ps-text-tertiary)" }}
            >
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
              className="w-full h-9 pl-8 pr-3 text-sm rounded-lg outline-none"
              style={{
                background: "var(--ps-input-bg)",
                border: "1px solid var(--ps-input-border)",
                color: "var(--ps-text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--ps-cyan)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px var(--ps-input-focus-shadow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--ps-input-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
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
                  className={`h-[30px] px-3 text-xs rounded-full whitespace-nowrap transition-all duration-150 ${
                    active ? "font-semibold" : "font-normal"
                  }`}
                  style={{
                    background: active ? "var(--ps-badge-bg)" : "transparent",
                    border: `1px solid ${active ? "var(--ps-border-active)" : "var(--ps-input-border)"}`,
                    color: active
                      ? "var(--ps-cyan)"
                      : "var(--ps-text-secondary)",
                    cursor: "pointer",
                  }}
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
            className="w-9 h-9 inline-flex items-center justify-center bg-transparent rounded-lg cursor-pointer transition-all duration-150"
            style={{
              border: "1px solid var(--ps-input-border)",
              color: "var(--ps-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ps-border-strong)";
              e.currentTarget.style.color = "var(--ps-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ps-input-border)";
              e.currentTarget.style.color = "var(--ps-text-secondary)";
            }}
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
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--ps-bg-surface)",
            border: "1px solid var(--ps-border-default)",
          }}
        >
          {/* Column headers */}
          <div
            className="grid gap-4 p-5"
            style={{
              gridTemplateColumns: "36px 180px 170px 1fr auto auto",
              background: "var(--ps-bg-elevated)",
              borderBottom: "1px solid var(--ps-border-subtle)",
            }}
          >
            <span />
            {COL_HEADERS.map((h) => (
              <span
                key={h}
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--ps-text-tertiary)",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Loading */}
          {isLoading && leads.length === 0 && (
            <div
              className="p-10 text-center text-sm"
              style={{
                color: "var(--ps-text-secondary)",
              }}
            >
              Cargando leads...
            </div>
          )}

          {/* Empty */}
          {!isLoading && leads.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2.5 p-12 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--ps-bg-elevated)",
                  border: "1px solid var(--ps-border-default)",
                }}
              >
                <Users
                  size={22}
                  style={{ color: "var(--ps-text-tertiary)" }}
                  strokeWidth={1.5}
                />
              </div>
              <p
                className="m-0 text-sm"
                style={{
                  color: "var(--ps-text-secondary)",
                }}
              >
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
            className="h-8 px-3.5 text-sm font-medium rounded-lg bg-transparent"
            style={{
              border: "1px solid var(--ps-input-border)",
              color:
                page === 0
                  ? "var(--ps-text-disabled)"
                  : "var(--ps-text-secondary)",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Anterior
          </button>

          <span
            className="text-xs px-2"
            style={{
              color: "var(--ps-text-secondary)",
            }}
          >
            Página {page + 1}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={leads.length < limit || isLoading}
            className="h-8 px-3.5 text-sm font-medium rounded-lg bg-transparent"
            style={{
              border: "1px solid var(--ps-input-border)",
              color:
                leads.length < limit
                  ? "var(--ps-text-disabled)"
                  : "var(--ps-text-secondary)",
              cursor: leads.length < limit ? "not-allowed" : "pointer",
            }}
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
