"use client";

/**
 * LeadList — ProSell-styled leads table with search, status filter pills,
 * real-time polling (30s), pagination and manual refresh.
 * All colors via var(--ps-*) tokens.
 */

import { useEffect, useState } from "react";
import { Lead, LeadStatus, useLeads } from "@/lib/api/leads";
import { LeadListItem } from "./LeadListItem";
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: 48,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "var(--ps-error)" }}>
          Error al cargar leads: {error.message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            height: 36,
            padding: "0 16px",
            background: "var(--ps-cyan)",
            color: "var(--ps-bg-base)",
            border: 0,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ps-text-tertiary)",
              pointerEvents: "none",
              display: "inline-flex",
            }}
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
            style={{
              width: "100%",
              height: 36,
              paddingLeft: 32,
              paddingRight: 12,
              background: "var(--ps-input-bg)",
              border: "1px solid var(--ps-input-border)",
              borderRadius: 8,
              color: "var(--ps-text-primary)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
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
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                style={{
                  height: 30,
                  padding: "0 12px",
                  background: active ? "var(--ps-badge-bg)" : "transparent",
                  border: `1px solid ${active ? "var(--ps-border-active)" : "var(--ps-input-border)"}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--ps-cyan)" : "var(--ps-text-secondary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition:
                    "border-color 150ms, color 150ms, background 150ms",
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
          style={{
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            color: "var(--ps-text-secondary)",
            cursor: "pointer",
            transition: "border-color 150ms, color 150ms",
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
        style={{
          background: "var(--ps-bg-surface)",
          border: "1px solid var(--ps-border-default)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 180px 170px 1fr auto auto",
            gap: 16,
            padding: "10px 20px",
            background: "var(--ps-bg-elevated)",
            borderBottom: "1px solid var(--ps-border-subtle)",
          }}
        >
          <span />
          {COL_HEADERS.map((h) => (
            <span
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
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
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--ps-text-secondary)",
              fontSize: 13,
            }}
          >
            Cargando leads...
          </div>
        )}

        {/* Empty */}
        {!isLoading && leads.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 48,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--ps-bg-elevated)",
                border: "1px solid var(--ps-border-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users
                size={22}
                style={{ color: "var(--ps-text-tertiary)" }}
                strokeWidth={1.5}
              />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
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
            style={{ cursor: onLeadClick ? "pointer" : "default" }}
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || isLoading}
          style={{
            height: 32,
            padding: "0 14px",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
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
          style={{
            fontSize: 12,
            color: "var(--ps-text-secondary)",
            padding: "0 8px",
          }}
        >
          Página {page + 1}
        </span>

        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={leads.length < limit || isLoading}
          style={{
            height: 32,
            padding: "0 14px",
            background: "transparent",
            border: "1px solid var(--ps-input-border)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
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
  );
}
