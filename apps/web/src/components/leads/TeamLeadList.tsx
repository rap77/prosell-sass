"use client";

/**
 * TeamLeadList — lista de leads para managers en ProSell.
 *
 * Features:
 * - Ver todos los leads del equipo (no solo los propios)
 * - Filtrar por vendedor
 * - Buscar por nombre de comprador o vehículo
 * - Filtrar por estado
 * - Destacar leads no leídos (< 5 min de antigüedad)
 * - Actualización en tiempo real (polling cada 30s)
 * - Soporte de paginación
 * - Exportar a CSV
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from "react";
import { Lead, LeadStatus, useLeads } from "@/lib/api/leads";
import { LeadListItem } from "./LeadListItem";
import { Search, RefreshCw, Download, AlertCircle } from "lucide-react";
import { useVendedores } from "@/lib/api/vendedores";

// ============================================
// STYLES
// ============================================

const FILTER_STYLES = `
  .ps-tll-input,
  .ps-tll-select {
    border-radius: 8px;
    border: 1px solid var(--ps-input-border);
    background: var(--ps-input-bg);
    color: var(--ps-text-primary);
    font-size: 13px;
    padding: 8px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .ps-tll-input:focus,
  .ps-tll-select:focus {
    border-color: var(--ps-cyan);
  }
  .ps-tll-input::placeholder {
    color: var(--ps-text-tertiary);
  }
  .ps-tll-select option {
    background: var(--ps-bg-surface);
    color: var(--ps-text-primary);
  }
  @keyframes spinRefresh {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

// ============================================
// TYPES
// ============================================

interface TeamLeadListProps {
  onLeadClick?: (leadId: string) => void;
  onReassignLead?: (leadId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function TeamLeadList({
  onLeadClick,
  onReassignLead,
}: TeamLeadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [vendedorFilter, setVendedorFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [isManualRefetch, setIsManualRefetch] = useState(false);
  const limit = 50;

  // Fetch vendedores para el filtro
  const { data: vendedores = [] } = useVendedores();

  // Construir filtros
  const filters: {
    status?: LeadStatus;
    search?: string;
    vendedor_id?: string;
  } = {};

  if (statusFilter !== "all") {
    filters.status = statusFilter;
  }

  if (searchQuery.trim()) {
    filters.search = searchQuery.trim();
  }

  if (vendedorFilter !== "all") {
    filters.vendedor_id = vendedorFilter;
  }

  // Fetch leads con polling en tiempo real (30s)
  const {
    data: leads = [],
    isLoading,
    error,
    refetch,
  } = useLeads(filters, limit, page * limit);

  const [unreadThreshold] = useState<Date>(
    () => new Date(Date.now() - 5 * 60 * 1000),
  );

  const isUnread = (lead: Lead) => {
    return new Date(lead.created_at) > unreadThreshold;
  };

  const handleRefresh = async () => {
    setIsManualRefetch(true);
    await refetch();
    setTimeout(() => setIsManualRefetch(false), 500);
  };

  const handleExportToCSV = () => {
    const headers = [
      "Comprador",
      "Email",
      "Teléfono",
      "Vehículo",
      "Estado",
      "Fuente",
      "Fecha",
    ];

    /**
     * Escapar campo CSV para prevenir CSV injection.
     * Si el campo comienza con =, -, +, o @, se antepone una comilla simple.
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

    const rows = leads.map((lead) => [
      escapeCsvField(lead.buyer_name),
      escapeCsvField(lead.buyer_email || ""),
      escapeCsvField(lead.buyer_phone || ""),
      escapeCsvField(lead.product?.title || "N/A"),
      escapeCsvField(lead.status),
      escapeCsvField(lead.source),
      escapeCsvField(lead.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

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

  // Estado de error
  if (error) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <AlertCircle
          size={32}
          strokeWidth={1.5}
          style={{ color: "var(--ps-error)" }}
        />
        <p style={{ margin: 0, fontSize: 13, color: "var(--ps-error)" }}>
          Error al cargar los leads: {error.message}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
            background: "var(--ps-bg-elevated)",
            border: "1px solid var(--ps-border-default)",
            color: "var(--ps-text-secondary)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const STATUS_LABELS: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: "Nuevo",
    [LeadStatus.CONTACTED]: "Contactado",
    [LeadStatus.QUALIFIED]: "Calificado",
    [LeadStatus.APPOINTMENT_SET]: "Turno agendado",
    [LeadStatus.LOST]: "Perdido",
  };

  const isLeadStatus = (v: string): v is LeadStatus => v in STATUS_LABELS;

  const isSpinning = isLoading || isManualRefetch;

  return (
    <>
      <style>{FILTER_STYLES}</style>

      <div className="flex flex-col gap-4">
        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--ps-text-tertiary)" }}
            />
            <input
              type="text"
              placeholder="Buscar por comprador o vehículo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="ps-tll-input pl-8 w-full"
              data-testid="search-input"
            />
          </div>

          {/* Filtro por vendedor */}
          <select
            value={vendedorFilter}
            onChange={(e) => setVendedorFilter(e.target.value)}
            className="ps-tll-select w-48"
            data-testid="vendedor-filter"
          >
            <option value="all">Todos los vendedores</option>
            {vendedores.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.name}
              </option>
            ))}
          </select>

          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all" || isLeadStatus(value))
                setStatusFilter(value);
            }}
            className="ps-tll-select w-48"
            data-testid="status-filter"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={handleExportToCSV}
            disabled={leads.length === 0}
            data-testid="export-csv-button"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--ps-border-default)] bg-[var(--ps-bg-elevated)] text-xs font-medium text-[var(--ps-text-secondary)] cursor-pointer transition-opacity duration-150"
            style={{ opacity: leads.length === 0 ? 0.5 : 1 }}
          >
            <Download size={13} strokeWidth={2} />
            Exportar CSV
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            data-testid="refresh-button"
            aria-label="Actualizar lista"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--ps-border-default)] bg-[var(--ps-bg-elevated)] text-[var(--ps-text-secondary)] cursor-pointer"
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              style={{
                animation: isSpinning
                  ? "spinRefresh 0.8s linear infinite"
                  : "none",
              }}
            />
          </button>
        </div>

        {/* ── Tabla de leads ── */}
        <div
          data-testid="team-lead-list"
          className="border border-[var(--ps-border-default)] rounded-xl overflow-hidden"
        >
          {/* Header de columnas */}
          <div className="flex items-center gap-4 px-4 py-3 bg-[var(--ps-bg-elevated)] border-b border-[var(--ps-border-default)] text-xs font-semibold uppercase tracking-widest text-[var(--ps-text-tertiary)]">
            <div className="w-48">Comprador</div>
            <div className="w-48">Vehículo</div>
            <div className="flex-1">Mensaje</div>
            <div className="flex-shrink-0">Estado</div>
            <div className="w-24 text-right">Hora</div>
            {onReassignLead && <div className="w-24">Acciones</div>}
          </div>

          {/* Estado de carga */}
          {isLoading && leads.length === 0 && (
            <div className="px-8 py-8 text-center text-sm text-[var(--ps-text-secondary)]">
              Cargando leads...
            </div>
          )}

          {/* Estado vacío */}
          {!isLoading && leads.length === 0 && (
            <div className="px-8 py-8 text-center text-sm text-[var(--ps-text-secondary)]">
              Sin resultados. Ajustá los filtros.
            </div>
          )}

          {/* Leads */}
          <div>
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
                    // Manejo por mutation hook
                  }}
                  actions={
                    onReassignLead ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReassignLead(lead.id);
                        }}
                        data-testid={`reassign-${lead.id}`}
                        className="h-7 px-2.5 rounded text-xs font-medium text-[var(--ps-text-secondary)] cursor-pointer border border-[var(--ps-border-default)] bg-transparent transition-colors duration-150"
                      >
                        Reasignar
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Paginación ── */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            data-testid="previous-page"
            className="h-9 px-4 rounded-lg border border-[var(--ps-border-default)] bg-[var(--ps-bg-elevated)] text-sm font-medium text-[var(--ps-text-secondary)] cursor-pointer transition-opacity duration-150"
            style={{ opacity: page === 0 || isLoading ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={leads.length < limit || isLoading}
            data-testid="next-page"
            className="h-9 px-4 rounded-lg border border-[var(--ps-border-default)] bg-[var(--ps-bg-elevated)] text-sm font-medium text-[var(--ps-text-secondary)] cursor-pointer transition-opacity duration-150"
            style={{ opacity: leads.length < limit || isLoading ? 0.5 : 1 }}
          >
            Siguiente
          </button>
        </div>
      </div>
    </>
  );
}
