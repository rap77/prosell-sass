"use client";

/**
 * AnalyticsPage — ProSell sales analytics dashboard.
 *
 * Data sources:
 *   useTeamMetrics() → KPI cards, conversion rate, vendedor leaderboard
 *   useLeads()       → status distribution funnel + source breakdown
 *
 * Sections:
 *   1. KPI row (4 cards)
 *   2. Pipeline funnel + Vendedor leaderboard (2-col grid)
 *   3. Lead source breakdown
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import {
  Loader2,
  Users,
  TrendingUp,
  Target,
  Zap,
  AlertCircle,
} from "lucide-react";
import {
  useTeamMetrics,
  useLeads,
  LeadStatus,
  type VendedorMetricsBreakdown,
} from "@/lib/api/leads";
import { cn } from "@/lib/utils";

// ─── Pipeline stages config ───────────────────────────────────────────────────

const FUNNEL_STAGES: {
  status: LeadStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  {
    status: LeadStatus.NEW,
    label: "Nuevos",
    color: "var(--ps-cyan)",
    bg: "rgba(77,184,255,0.15)",
  },
  {
    status: LeadStatus.CONTACTED,
    label: "Contactados",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.15)",
  },
  {
    status: LeadStatus.QUALIFIED,
    label: "Calificados",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.15)",
  },
  {
    status: LeadStatus.APPOINTMENT_SET,
    label: "Con cita",
    color: "var(--ps-success)",
    bg: "rgba(52,211,153,0.15)",
  },
];

const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  web: "Web",
  manual: "Manual",
  email: "Email",
  phone: "Teléfono",
};

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  whatsapp: "var(--ps-whatsapp)",
  web: "var(--ps-cyan)",
  manual: "var(--ps-text-secondary)",
  email: "#f59e0b",
  phone: "#a78bfa",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-ps-surface border border-ps-border-default rounded-xl py-5 px-6 flex flex-col gap-3">
      {/* Icon badge */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: `${accent}22`, border: `1px solid ${accent}33` }}
      >
        <Icon size={18} strokeWidth={2} style={{ color: accent }} />
      </div>

      {/* Value */}
      <div>
        <p className="m-0 text-[28px] font-bold text-ps-text-primary tracking-[-0.03em] leading-none">
          {value}
        </p>
        <p className="mt-1 text-xs text-ps-text-secondary font-medium">
          {label}
        </p>
        {sub && (
          <p className="mt-[3px] text-[11px] text-ps-text-tertiary">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ps-surface border border-ps-border-default rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-ps-border-subtle">
        <h3 className="m-0 text-sm font-semibold text-ps-text-primary">
          {title}
        </h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Funnel bar row ────────────────────────────────────────────────────────────

function FunnelRow({
  label,
  count,
  total,
  color,
  bg,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  bg: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ps-text-primary">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color }}>
            {count}
          </span>
          <span className="text-[11px] text-ps-text-tertiary w-[34px] text-right">
            {pct}%
          </span>
        </div>
      </div>
      {/* Bar track */}
      <div className="h-1.5 rounded-full bg-ps-elevated overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${bg.replace("0.15", "0.6")})`,
            transition: "width 600ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Vendedor row ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function VendedorRow({
  rank,
  vendedor,
  maxLeads,
}: {
  rank: number;
  vendedor: VendedorMetricsBreakdown;
  maxLeads: number;
}) {
  const barPct = maxLeads > 0 ? (vendedor.total_leads / maxLeads) * 100 : 0;
  const isTop = rank === 1;

  return (
    <div className="grid grid-cols-[28px_32px_1fr_auto] items-center gap-2.5 py-2 border-b border-ps-border-subtle">
      {/* Rank */}
      <span
        className={cn(
          "text-[11px] font-bold text-center",
          isTop ? "text-ps-cyan" : "text-ps-text-tertiary",
        )}
      >
        #{rank}
      </span>

      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
          isTop
            ? "text-ps-base"
            : "bg-ps-elevated border border-ps-border-default text-ps-text-secondary",
        )}
        style={
          isTop
            ? {
                background:
                  "linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))",
                border: "none",
              }
            : undefined
        }
      >
        {getInitials(vendedor.vendedor_name)}
      </div>

      {/* Name + bar */}
      <div className="min-w-0">
        <p className="mb-1 text-[13px] font-semibold text-ps-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
          {vendedor.vendedor_name}
        </p>
        <div className="h-1 rounded-full bg-ps-elevated overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${barPct}%`,
              background: isTop
                ? "linear-gradient(90deg, var(--ps-cyan), var(--ps-blue))"
                : "var(--ps-border-medium)",
              transition: "width 600ms cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <p className="m-0 text-sm font-bold text-ps-text-primary">
          {vendedor.total_leads}
        </p>
        <p className="m-0 text-[10px] text-ps-text-tertiary">
          {Math.round(vendedor.conversion_rate * 100)}% conv.
        </p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PulseBox({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div
      className="rounded-lg bg-ps-elevated"
      style={{
        width: w,
        height: h,
        animation: "psPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <style>{`@keyframes psPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-ps-surface border border-ps-border-default rounded-xl p-5 flex flex-col gap-3"
          >
            <PulseBox w={36} h={36} />
            <div className="flex flex-col gap-1.5">
              <PulseBox w="50%" h={28} />
              <PulseBox w="70%" h={12} />
            </div>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-ps-surface border border-ps-border-default rounded-xl p-5 h-72">
          <PulseBox h={16} w="40%" />
        </div>
        <div className="bg-ps-surface border border-ps-border-default rounded-xl p-5 h-72">
          <PulseBox h={16} w="50%" />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useTeamMetrics();
  // Cap at 100 to stay within ListLeadsRequest DTO limit (le=100)
  const { data: leads = [], isLoading: leadsLoading } = useLeads(
    undefined,
    100,
  );

  const isLoading = metricsLoading || leadsLoading;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const lead of leads) {
    statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
  }

  const activeFunnelTotal = FUNNEL_STAGES.reduce(
    (sum, s) => sum + (statusCounts[s.status] ?? 0),
    0,
  );

  // Source breakdown
  const sourceCountsByKey: Record<string, number> = {};
  for (const lead of leads) {
    if (lead.source)
      sourceCountsByKey[lead.source] =
        (sourceCountsByKey[lead.source] ?? 0) + 1;
  }
  const sourceCounts = Object.entries(sourceCountsByKey).sort(
    ([, a], [, b]) => b - a,
  );

  const lostCount = statusCounts[LeadStatus.LOST] ?? 0;
  const totalLeads = metrics?.total_leads ?? leads.length;

  // Vendedor leaderboard — sorted by total_leads desc
  const leaderboard = metrics?.vendedor_breakdown
    ? [...metrics.vendedor_breakdown].sort(
        (a, b) => b.total_leads - a.total_leads,
      )
    : [];

  const maxVendedorLeads = leaderboard[0]?.total_leads ?? 1;

  const conversionPct = metrics
    ? `${Math.round(metrics.conversion_rate * 100)}%`
    : "—";

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-ps-text-primary leading-tight">
            Analytics
          </h1>
          <p className="mt-1 text-[13px] text-ps-text-secondary">
            Métricas de ventas y performance del equipo.
          </p>
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (metricsError) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-ps-error-bg border border-destructive flex items-center justify-center">
          <AlertCircle
            size={24}
            strokeWidth={2}
            style={{ color: "var(--ps-error)" }}
          />
        </div>
        <div className="text-center">
          <p className="m-0 text-base font-semibold text-ps-text-primary">
            No se pudieron cargar las métricas
          </p>
          <p className="mt-1.5 text-[13px] text-ps-text-secondary">
            {metricsError.message}
          </p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-ps-text-primary leading-tight">
            Analytics
          </h1>
          <p className="mt-1 text-[13px] text-ps-text-secondary">
            Métricas de ventas y performance del equipo.
          </p>
        </div>

        {/* Period chip */}
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-ps-elevated border border-ps-border-default text-xs font-medium text-ps-text-secondary whitespace-nowrap shrink-0">
          Últimos 30 días
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Total de leads"
          value={totalLeads}
          accent="var(--ps-cyan)"
        />
        <KpiCard
          icon={Zap}
          label="Nuevos (últimas 24 h)"
          value={metrics?.new_leads_last_24h ?? 0}
          accent="var(--ps-success)"
        />
        <KpiCard
          icon={Target}
          label="Tasa de conversión"
          value={conversionPct}
          sub="leads activos → cita"
          accent="#a78bfa"
        />
        <KpiCard
          icon={TrendingUp}
          label="Leads perdidos"
          value={lostCount}
          sub={
            totalLeads > 0
              ? `${Math.round((lostCount / totalLeads) * 100)}% del total`
              : undefined
          }
          accent="var(--ps-error)"
        />
      </div>

      {/* ── Main grid: Funnel + Leaderboard ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline funnel */}
        <SectionCard title="Funnel de pipeline">
          <div className="flex flex-col gap-4">
            {FUNNEL_STAGES.map((stage) => (
              <FunnelRow
                key={stage.status}
                label={stage.label}
                count={statusCounts[stage.status] ?? 0}
                total={activeFunnelTotal}
                color={stage.color}
                bg={stage.bg}
              />
            ))}

            {/* Lost separator */}
            <div className="h-px bg-ps-border-subtle my-1" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ps-text-secondary">
                Perdidos
              </span>
              <span
                className="text-[13px] font-bold"
                style={{ color: "var(--ps-error)" }}
              >
                {lostCount}
              </span>
            </div>

            {/* Summary */}
            <div className="mt-1 px-3.5 py-3 rounded-[10px] bg-ps-elevated flex items-center justify-between">
              <span className="text-xs text-ps-text-secondary">
                Total activos en pipeline
              </span>
              <span className="text-base font-bold text-ps-cyan">
                {activeFunnelTotal}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Vendedor leaderboard */}
        <SectionCard title="Ranking de vendedores">
          {leaderboard.length === 0 ? (
            <p className="m-0 text-[13px] text-ps-text-tertiary text-center py-8">
              Sin datos de vendedores aún.
            </p>
          ) : (
            <div>
              {leaderboard.map((v, i) => (
                <VendedorRow
                  key={v.vendedor_id}
                  rank={i + 1}
                  vendedor={v}
                  maxLeads={maxVendedorLeads}
                />
              ))}

              {/* Legend */}
              <p className="mt-3 text-[11px] text-ps-text-tertiary">
                Ordenado por total de leads asignados.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Source breakdown ───────────────────────────────────────────────── */}
      {sourceCounts.length > 0 && (
        <SectionCard title="Leads por canal">
          <div className="flex flex-wrap gap-2.5">
            {sourceCounts.map(([source, count]) => {
              const color = SOURCE_COLORS[source] ?? "var(--ps-text-secondary)";
              const label = SOURCE_LABELS[source] ?? source;
              const pct =
                leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
              return (
                <div
                  key={source}
                  className="inline-flex flex-col gap-1.5 px-4 py-3 rounded-[10px] bg-ps-elevated border border-ps-border-subtle min-w-[110px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                    />
                    <span className="text-xs font-semibold text-ps-text-primary">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-[22px] font-bold tracking-[-0.03em]"
                      style={{ color }}
                    >
                      {count}
                    </span>
                    <span className="text-[11px] text-ps-text-tertiary">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
