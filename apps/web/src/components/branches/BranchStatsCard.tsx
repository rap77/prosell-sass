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

function PulseBox({ width, height, borderRadius = 6 }: { width?: number | string; height: number; borderRadius?: number }) {
  return (
    <div style={{
      width: width ?? '100%',
      height,
      borderRadius,
      background: 'var(--ps-bg-elevated)',
      animation: 'psBranchPulse 1.6s ease-in-out infinite',
    }} />
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

export function BranchStatsCard({ branchId, branchName }: BranchStatsCardProps) {
  const { data: stats, isLoading, error } = useBranchStats(branchId);

  const cardStyle: React.CSSProperties = {
    background: 'var(--ps-bg-surface)',
    border: '1px solid var(--ps-border-default)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderBottom: '1px solid var(--ps-border-default)',
  }

  const contentStyle: React.CSSProperties = {
    padding: '16px 20px',
  }

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <style>{`@keyframes psBranchPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        <div style={headerStyle}>
          <PulseBox height={18} width={192} />
        </div>
        <div style={contentStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <PulseBox height={64} />
            <PulseBox height={64} />
            <PulseBox height={64} />
          </div>
          <div style={{ marginTop: 12 }}>
            <PulseBox height={12} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            {branchName}
          </h3>
        </div>
        <div style={contentStyle}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-error)' }}>
            Error al cargar estadísticas
          </p>
        </div>
      </div>
    );
  }

  const statCell: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 10px',
    borderRadius: 8,
    background: 'var(--ps-bg-elevated)',
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            {branchName}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ps-text-disabled)' }}>
            <Activity size={13} strokeWidth={2} style={{ color: 'var(--ps-text-disabled)' }} />
            <span>{formatDate(stats?.last_activity ?? null)}</span>
          </div>
        </div>
      </div>

      <div style={contentStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>

          {/* Total */}
          <div style={statCell}>
            <Car size={18} strokeWidth={2} style={{ color: 'var(--ps-cyan)', marginBottom: 8 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
              {stats?.total_vehicles ?? 0}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ps-text-disabled)', marginTop: 2 }}>
              Total
            </span>
          </div>

          {/* Publicados */}
          <div style={statCell}>
            <Eye size={18} strokeWidth={2} style={{ color: 'var(--ps-success)', marginBottom: 8 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
              {stats?.published_vehicles ?? 0}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ps-text-disabled)', marginTop: 2 }}>
              Publicados
            </span>
          </div>

          {/* Borrador */}
          <div style={statCell}>
            <FileText size={18} strokeWidth={2} style={{ color: 'var(--ps-warning)', marginBottom: 8 }} />
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
              {stats?.draft_vehicles ?? 0}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ps-text-disabled)', marginTop: 2 }}>
              Borrador
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
