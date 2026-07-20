"use client";

/**
 * BranchStatsCard — estadísticas de sucursal en ProSell.
 *
 * Muestra vehículos totales, publicados y en borrador para una sucursal.
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { Car, Eye, FileText, Activity } from "lucide-react";
import { useBranchStats } from "@/lib/api/branches";

// ============================================
// HELPERS
// ============================================

function PulseBox({
  width,
  height,
  borderRadius = 6,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
}) {
  return (
    <div
      className="bg-elevated animate-pulse-branch"
      style={{
        width: width ?? "100%",
        height,
        borderRadius,
        animation: "psBranchPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Sin actividad";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString("es-AR");
}

// ============================================
// TYPES
// ============================================

interface BranchStatsCardProps {
  branchId: string;
  branchName: string;
}

// ============================================
// COMPONENT
// ============================================

export function BranchStatsCard({
  branchId,
  branchName,
}: BranchStatsCardProps) {
  const { data: stats, isLoading, error } = useBranchStats(branchId);

  const cardClass =
    "bg-surface border border-default rounded-lg overflow-hidden";
  const headerClass = "px-5 py-4 border-b border-default";
  const contentClass = "px-5 py-4";

  if (isLoading) {
    return (
      <div className={cardClass}>
        <style>{`@keyframes psBranchPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        <div className={headerClass}>
          <PulseBox height={18} width={192} />
        </div>
        <div className={contentClass}>
          <div className="grid grid-cols-3 gap-3">
            <PulseBox height={64} />
            <PulseBox height={64} />
            <PulseBox height={64} />
          </div>
          <div className="mt-3">
            <PulseBox height={12} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardClass}>
        <div className={headerClass}>
          <h3 className="m-0 text-sm font-semibold text-primary">
            {branchName}
          </h3>
        </div>
        <div className={contentClass}>
          <p className="m-0 text-xs text-error">Error al cargar estadísticas</p>
        </div>
      </div>
    );
  }

  const statCellClass =
    "flex flex-col items-center px-2.5 py-3.5 rounded bg-elevated";

  return (
    <div className={cardClass}>
      <div className={headerClass}>
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-sm font-semibold text-primary">
            {branchName}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-tertiary">
            <Activity size={13} strokeWidth={2} />
            <span>{formatDate(stats?.last_activity ?? null)}</span>
          </div>
        </div>
      </div>

      <div className={contentClass}>
        <div className="grid grid-cols-3 gap-3">
          {/* Total */}
          <div className={statCellClass}>
            <Car
              size={18}
              strokeWidth={2}
              style={{ color: "var(--ps-cyan)", marginBottom: 8 }}
            />
            <span className="text-2xl font-bold text-primary">
              {stats?.total_vehicles ?? 0}
            </span>
            <span className="text-xs text-tertiary mt-0.5">Total</span>
          </div>

          {/* Publicados */}
          <div className={statCellClass}>
            <Eye
              size={18}
              strokeWidth={2}
              style={{ color: "var(--ps-success)", marginBottom: 8 }}
            />
            <span className="text-2xl font-bold text-primary">
              {stats?.published_vehicles ?? 0}
            </span>
            <span className="text-xs text-tertiary mt-0.5">Publicados</span>
          </div>

          {/* Borrador */}
          <div className={statCellClass}>
            <FileText
              size={18}
              strokeWidth={2}
              style={{ color: "var(--ps-warning)", marginBottom: 8 }}
            />
            <span className="text-2xl font-bold text-primary">
              {stats?.draft_vehicles ?? 0}
            </span>
            <span className="text-xs text-tertiary mt-0.5">Borrador</span>
          </div>
        </div>
      </div>
    </div>
  );
}
