"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLeads, useTeamMetrics, LeadStatus } from "@/lib/api/leads";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Briefcase,
  TrendingUp,
  BarChart3,
  Plus,
  ChevronRight,
} from "lucide-react";

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const diffMin = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 60000,
  );
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} hora${diffHr > 1 ? "s" : ""}`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

const AVATAR_GRADIENTS: [string, string][] = [
  ["#4DB8FF", "#1E5FD4"],
  ["#22D3A0", "#1E5FD4"],
  ["#F5A623", "#F04438"],
  ["#7DCEFF", "#4DB8FF"],
  ["#9C5CF7", "#1E5FD4"],
  ["#0D1B6E", "#4DB8FF"],
];

function getAvatarGradient(id: string): [string, string] {
  const code = id.charCodeAt(0) + (id.charCodeAt(id.length - 1) || 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function getSourceStyle(source: string): {
  bg: string;
  color: string;
  label: string;
} {
  const s = source.toLowerCase();
  if (s.includes("facebook") || s === "fb")
    return {
      bg: "rgba(77,184,255,0.15)",
      color: "var(--ps-cyan)",
      label: "FB",
    };
  if (s.includes("autotrader") || s === "at")
    return {
      bg: "rgba(245,166,35,0.15)",
      color: "var(--ps-warning)",
      label: "AT",
    };
  const label =
    source.length > 3
      ? source.substring(0, 2).toUpperCase()
      : source.toUpperCase();
  return { bg: "rgba(34,211,160,0.15)", color: "var(--ps-success)", label };
}

const STATUS_BADGE: Record<
  LeadStatus,
  { bg: string; color: string; label: string }
> = {
  [LeadStatus.NEW]: {
    bg: "rgba(77,184,255,0.14)",
    color: "var(--ps-cyan)",
    label: "Nuevo",
  },
  [LeadStatus.CONTACTED]: {
    bg: "rgba(245,166,35,0.12)",
    color: "var(--ps-warning)",
    label: "Contactado",
  },
  [LeadStatus.QUALIFIED]: {
    bg: "rgba(34,211,160,0.12)",
    color: "var(--ps-success)",
    label: "Calificado",
  },
  [LeadStatus.APPOINTMENT_SET]: {
    bg: "rgba(34,211,160,0.18)",
    color: "var(--ps-success)",
    label: "Con cita",
  },
  [LeadStatus.LOST]: {
    bg: "rgba(138,155,191,0.12)",
    color: "var(--ps-text-secondary)",
    label: "Perdido",
  },
};

const PIPELINE_STAGES = [
  {
    status: LeadStatus.NEW,
    label: "Nuevo",
    fill: "linear-gradient(90deg, var(--ps-navy), var(--ps-blue))",
  },
  {
    status: LeadStatus.CONTACTED,
    label: "Contactado",
    fill: "linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))",
  },
  {
    status: LeadStatus.QUALIFIED,
    label: "Calificado",
    fill: "linear-gradient(90deg, var(--ps-cyan), var(--ps-cyan-hover))",
    glow: "rgba(77,184,255,0.4)",
  },
  {
    status: LeadStatus.APPOINTMENT_SET,
    label: "Con cita",
    fill: "linear-gradient(90deg, var(--ps-success), #5BE6BC)",
    glow: "rgba(34,211,160,0.4)",
  },
] as const;

// ─── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="bg-ps-surface border border-ps-border-subtle rounded-xl p-5">
      {children}
    </section>
  );
}

function CardHead({
  title,
  linkLabel,
  linkHref,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <h2 className="m-0 text-[15px] font-semibold text-ps-text-primary">
        {title}
      </h2>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          className="text-xs text-ps-cyan font-medium no-underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Recent leads body ────────────────────────────────────────────────────────

type RecentLead = NonNullable<
  ReturnType<typeof useLeads>["data"]
>[number];

function RecentLeadsList({
  leads,
  isLoading,
}: {
  leads: RecentLead[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="py-6 text-center text-ps-text-secondary text-[13px]">
        Cargando…
      </div>
    );
  }
  if (leads.length === 0) {
    return (
      <div className="py-6 text-center text-ps-text-secondary text-[13px]">
        No hay leads aún
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {leads.map((lead) => {
        const ss = STATUS_BADGE[lead.status];
        const src = getSourceStyle(lead.source);
        const [g1, g2] = getAvatarGradient(lead.id);
        return (
          <Link
            key={lead.id}
            href="/vendedor/leads"
            className="flex items-center gap-3 py-[10px] px-3 rounded-lg no-underline transition-colors duration-[180ms] min-w-0 hover:bg-ps-table-row-hover"
          >
            <div
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-xs font-bold tracking-[0.02em] text-ps-base flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
              }}
            >
              {getInitials(lead.buyer_name)}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-[3px]">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ps-text-primary min-w-0">
                <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {lead.buyer_name}
                </span>
                <span
                  className="text-[9.5px] font-bold py-0.5 px-1.5 rounded tracking-[0.04em] flex-shrink-0"
                  style={{ background: src.bg, color: src.color }}
                >
                  {src.label}
                </span>
              </div>
              <span className="text-[11.5px] text-ps-text-tertiary font-mono">
                {formatRelativeTime(lead.created_at)}
              </span>
            </div>
            <span
              className="inline-flex items-center gap-[5px] text-[11.5px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap"
              style={{ background: ss.bg, color: ss.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
              {ss.label}
            </span>
            <span className="text-ps-text-tertiary inline-flex">
              <ChevronRight size={16} strokeWidth={2} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Team breakdown body ───────────────────────────────────────────────────────

type VendedorBreakdown = NonNullable<
  ReturnType<typeof useTeamMetrics>["data"]
>["vendedor_breakdown"][number];

function TeamBreakdown({
  breakdown,
  isLoading,
}: {
  breakdown: VendedorBreakdown[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="py-3 text-center text-ps-text-secondary text-[13px]">
        Cargando…
      </div>
    );
  }
  if (!breakdown?.length) {
    return (
      <div className="py-3 text-center text-ps-text-secondary text-[13px]">
        Sin vendedores asignados
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {breakdown.slice(0, 5).map((v) => {
        const [g1, g2] = getAvatarGradient(v.vendedor_id);
        return (
          <div
            key={v.vendedor_id}
            className="flex items-center gap-2.5 py-1.5 px-1"
          >
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-ps-base"
              style={{
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
              }}
            >
              {getInitials(v.vendedor_name)}
            </div>
            <span className="flex-1 text-[13px] font-medium text-ps-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
              {v.vendedor_name}
            </span>
            <span className="text-[12.5px] font-mono text-ps-text-secondary flex-shrink-0">
              {v.total_leads} lead{v.total_leads !== 1 ? "s" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.first_name ?? "Vendedor";
  const greeting = getGreeting();

  // Cap at 100 to stay within ListLeadsRequest DTO limit (le=100)
  const { data: allLeads = [], isLoading: leadsLoading } = useLeads(
    undefined,
    100,
  );
  const { data: metrics, isLoading: metricsLoading } = useTeamMetrics();

  const isLoading = leadsLoading || metricsLoading;

  // React Compiler (React 19) memoizes these derived values automatically —
  // no useMemo needed.
  const recentLeads = [...allLeads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  const pipelineCounts: Record<LeadStatus, number> = {
    [LeadStatus.NEW]: 0,
    [LeadStatus.CONTACTED]: 0,
    [LeadStatus.QUALIFIED]: 0,
    [LeadStatus.APPOINTMENT_SET]: 0,
    [LeadStatus.LOST]: 0,
  };
  for (const l of allLeads) pipelineCounts[l.status]++;

  const activeLeads = allLeads.filter(
    (l) => l.status !== LeadStatus.LOST,
  ).length;
  const maxPipelineCount = Math.max(
    ...PIPELINE_STAGES.map((s) => pipelineCounts[s.status]),
    1,
  );
  const newLeadsToday = metrics?.new_leads_last_24h ?? 0;
  const totalLeads = metrics?.total_leads ?? allLeads.length;
  const conversionPct = metrics
    ? `${(metrics.conversion_rate * 100).toFixed(0)}%`
    : "—";

  const KPIS = [
    {
      label: "Leads hoy",
      value: isLoading ? "—" : String(newLeadsToday),
      delta: "últimas 24 horas",
      trend: "up" as const,
      Icon: Inbox,
    },
    {
      label: "Conversión",
      value: isLoading ? "—" : conversionPct,
      delta: "nuevo → cita",
      trend: "up" as const,
      Icon: TrendingUp,
    },
    {
      label: "Leads activos",
      value: isLoading ? "—" : String(activeLeads),
      delta: "en pipeline activo",
      trend: "warn" as const,
      Icon: Briefcase,
    },
    {
      label: "Total leads",
      value: isLoading ? "—" : String(totalLeads),
      delta: "desde el inicio",
      trend: "up" as const,
      Icon: BarChart3,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="mb-1 text-[22px] font-bold tracking-[-0.015em] text-ps-text-primary">
            {greeting}, {firstName}
          </h1>
          <p className="m-0 text-[13px] text-ps-text-secondary">
            Hoy ·{" "}
            <b className="text-ps-text-primary font-semibold">
              {isLoading
                ? "…"
                : `${newLeadsToday} lead${newLeadsToday !== 1 ? "s" : ""} nuevo${newLeadsToday !== 1 ? "s" : ""}`}
            </b>
          </p>
        </div>

        <Link
          href="/publications"
          className="inline-flex items-center gap-2 bg-ps-cyan text-ps-base py-[9px] px-4 rounded-lg text-[13.5px] font-semibold no-underline transition-all duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] flex-shrink-0 hover:bg-ps-cyan-hover hover:shadow-[0_6px_20px_rgba(77,184,255,0.3)] hover:-translate-y-px"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva publicación
        </Link>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5">
        {KPIS.map(({ label, value, delta, trend, Icon }) => (
          <div
            key={label}
            className="relative bg-ps-surface border border-ps-border-subtle rounded-xl p-5 flex flex-col gap-1.5 transition-colors duration-200 hover:border-ps-border-medium"
          >
            <div className="absolute top-[18px] right-[18px] w-8 h-8 rounded-lg bg-ps-accent-glow-soft border border-ps-border-default inline-flex items-center justify-center text-ps-cyan">
              <Icon size={16} strokeWidth={2} />
            </div>
            <span className="text-[13px] text-ps-text-secondary">{label}</span>
            <span className="text-[36px] font-extrabold tracking-[-0.03em] leading-none text-ps-text-primary mt-0.5 mb-1 tabular-nums">
              {value}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                trend === "up" ? "text-ps-success" : "text-ps-warning",
              )}
            >
              {delta}
            </span>
          </div>
        ))}
      </div>

      {/* ── Two-column section ────────────────────────────────────────────── */}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4">
        {/* Leads recientes */}
        <Card>
          <CardHead
            title="Leads recientes"
            linkLabel="Ver todos →"
            linkHref="/vendedor/leads"
          />

          <RecentLeadsList leads={recentLeads} isLoading={isLoading} />

          <div className="text-center pt-3 mt-2 border-t border-ps-border-subtle">
            <Link
              href="/vendedor/leads"
              className="text-[13px] text-ps-cyan font-medium no-underline"
            >
              Ver todos los leads →
            </Link>
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Pipeline */}
          <Card>
            <CardHead
              title="Pipeline"
              linkLabel="Ver completo →"
              linkHref="/pipeline"
            />
            <div className="flex flex-col gap-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = pipelineCounts[stage.status];
                const pct = Math.round((count / maxPipelineCount) * 100);
                return (
                  <div
                    key={stage.status}
                    className="grid grid-cols-[90px_1fr_44px] gap-3 items-center"
                  >
                    <span className="text-[13px] font-semibold text-ps-text-primary">
                      {stage.label}
                    </span>
                    <div className="h-2 rounded-full bg-ps-accent-glow-soft overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: stage.fill,
                          boxShadow:
                            "glow" in stage
                              ? `0 0 10px ${stage.glow}`
                              : "none",
                        }}
                      />
                    </div>
                    <span className="text-right text-[12.5px] font-bold font-mono text-ps-text-primary tracking-[-0.01em]">
                      {isLoading ? "—" : count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-ps-border-subtle text-xs text-ps-text-secondary">
              <b className="text-ps-text-primary font-semibold">
                {isLoading ? "—" : activeLeads} lead
                {activeLeads !== 1 ? "s" : ""}
              </b>{" "}
              activos
            </div>
          </Card>

          {/* Equipo */}
          <Card>
            <CardHead title="Equipo · Leads" />
            <TeamBreakdown
              breakdown={metrics?.vendedor_breakdown}
              isLoading={isLoading}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
