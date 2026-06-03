'use client'

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

import { useMemo } from 'react'
import { Loader2, Users, TrendingUp, Target, Zap, AlertCircle } from 'lucide-react'
import { useTeamMetrics, useLeads, LeadStatus, type VendedorMetricsBreakdown } from '@/lib/api/leads'

// ─── Pipeline stages config ───────────────────────────────────────────────────

const FUNNEL_STAGES: { status: LeadStatus; label: string; color: string; bg: string }[] = [
  { status: LeadStatus.NEW,             label: 'Nuevos',       color: 'var(--ps-cyan)',    bg: 'rgba(77,184,255,0.15)'  },
  { status: LeadStatus.CONTACTED,       label: 'Contactados',  color: '#60a5fa',           bg: 'rgba(96,165,250,0.15)'  },
  { status: LeadStatus.QUALIFIED,       label: 'Calificados',  color: '#a78bfa',           bg: 'rgba(167,139,250,0.15)' },
  { status: LeadStatus.APPOINTMENT_SET, label: 'Con cita',     color: 'var(--ps-success)', bg: 'rgba(52,211,153,0.15)'  },
]

const SOURCE_LABELS: Record<string, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  whatsapp:  'WhatsApp',
  web:       'Web',
  manual:    'Manual',
  email:     'Email',
  phone:     'Teléfono',
}

const SOURCE_COLORS: Record<string, string> = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  whatsapp:  '#25D366',
  web:       'var(--ps-cyan)',
  manual:    'var(--ps-text-secondary)',
  email:     '#f59e0b',
  phone:     '#a78bfa',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent: string
}) {
  return (
    <div style={{
      background: 'var(--ps-bg-surface)',
      border: '1px solid var(--ps-border-default)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Icon badge */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${accent}22`,
        border: `1px solid ${accent}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} strokeWidth={2} style={{ color: accent }} />
      </div>

      {/* Value */}
      <div>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--ps-text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ps-text-secondary)', fontWeight: 500 }}>
          {label}
        </p>
        {sub && (
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ps-text-disabled)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--ps-bg-surface)',
      border: '1px solid var(--ps-border-default)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--ps-border-subtle)',
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Funnel bar row ────────────────────────────────────────────────────────────

function FunnelRow({
  label,
  count,
  total,
  color,
  bg,
}: {
  label: string
  count: number
  total: number
  color: string
  bg: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-primary)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            {count}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ps-text-disabled)', width: 34, textAlign: 'right' }}>
            {pct}%
          </span>
        </div>
      </div>
      {/* Bar track */}
      <div style={{
        height: 6,
        borderRadius: 99,
        background: 'var(--ps-bg-elevated)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, ${bg.replace('0.15', '0.6')})`,
          transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

// ─── Vendedor row ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function VendedorRow({
  rank,
  vendedor,
  maxLeads,
}: {
  rank: number
  vendedor: VendedorMetricsBreakdown
  maxLeads: number
}) {
  const barPct = maxLeads > 0 ? (vendedor.total_leads / maxLeads) * 100 : 0
  const isTop = rank === 1

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 32px 1fr auto',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid var(--ps-border-subtle)',
    }}>
      {/* Rank */}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: isTop ? 'var(--ps-cyan)' : 'var(--ps-text-disabled)',
        textAlign: 'center',
      }}>
        #{rank}
      </span>

      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: isTop
          ? 'linear-gradient(135deg, var(--ps-cyan), var(--ps-blue))'
          : 'var(--ps-bg-elevated)',
        border: isTop ? 'none' : '1px solid var(--ps-border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: isTop ? 'var(--ps-bg-base)' : 'var(--ps-text-secondary)',
        flexShrink: 0,
      }}>
        {getInitials(vendedor.vendedor_name)}
      </div>

      {/* Name + bar */}
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vendedor.vendedor_name}
        </p>
        <div style={{ height: 4, borderRadius: 99, background: 'var(--ps-bg-elevated)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${barPct}%`,
            borderRadius: 99,
            background: isTop ? 'linear-gradient(90deg, var(--ps-cyan), var(--ps-blue))' : 'var(--ps-border-medium)',
            transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
          {vendedor.total_leads}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--ps-text-disabled)' }}>
          {Math.round(vendedor.conversion_rate * 100)}% conv.
        </p>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PulseBox({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: 8,
      background: 'var(--ps-bg-elevated)',
      animation: 'psPulse 1.6s ease-in-out infinite',
    }} />
  )
}

function AnalyticsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes psPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: 'var(--ps-bg-surface)', border: '1px solid var(--ps-border-default)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PulseBox w={36} h={36} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <PulseBox w="50%" h={28} />
              <PulseBox w="70%" h={12} />
            </div>
          </div>
        ))}
      </div>
      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--ps-bg-surface)', border: '1px solid var(--ps-border-default)', borderRadius: 12, padding: 20, height: 280 }}>
          <PulseBox h={16} w="40%" />
        </div>
        <div style={{ background: 'var(--ps-bg-surface)', border: '1px solid var(--ps-border-default)', borderRadius: 12, padding: 20, height: 280 }}>
          <PulseBox h={16} w="50%" />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useTeamMetrics()
  // Cap at 100 to stay within ListLeadsRequest DTO limit (le=100)
  const { data: leads = [], isLoading: leadsLoading } = useLeads(undefined, 100)

  const isLoading = metricsLoading || leadsLoading

  // Status distribution
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const lead of leads) {
      counts[lead.status] = (counts[lead.status] ?? 0) + 1
    }
    return counts
  }, [leads])

  const activeFunnelTotal = useMemo(
    () => FUNNEL_STAGES.reduce((sum, s) => sum + (statusCounts[s.status] ?? 0), 0),
    [statusCounts]
  )

  // Source breakdown
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const lead of leads) {
      if (lead.source) counts[lead.source] = (counts[lead.source] ?? 0) + 1
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a)
  }, [leads])

  const lostCount  = statusCounts[LeadStatus.LOST] ?? 0
  const totalLeads = metrics?.total_leads ?? leads.length

  // Vendedor leaderboard — sorted by total_leads desc
  const leaderboard = useMemo(() => {
    if (!metrics?.vendedor_breakdown) return []
    return [...metrics.vendedor_breakdown].sort((a, b) => b.total_leads - a.total_leads)
  }, [metrics])

  const maxVendedorLeads = leaderboard[0]?.total_leads ?? 1

  const conversionPct = metrics
    ? `${Math.round(metrics.conversion_rate * 100)}%`
    : '—'

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)', lineHeight: 1.2 }}>
            Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Métricas de ventas y performance del equipo.
          </p>
        </div>
        <AnalyticsSkeleton />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (metricsError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--ps-error-bg)',
          border: '1px solid var(--ps-error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={24} strokeWidth={2} style={{ color: 'var(--ps-error)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            No se pudieron cargar las métricas
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            {metricsError.message}
          </p>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ps-text-primary)', lineHeight: 1.2 }}>
            Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Métricas de ventas y performance del equipo.
          </p>
        </div>

        {/* Period chip */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 14px',
          borderRadius: 99,
          background: 'var(--ps-bg-elevated)',
          border: '1px solid var(--ps-border-default)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ps-text-secondary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          Últimos 30 días
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
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
          sub={totalLeads > 0 ? `${Math.round((lostCount / totalLeads) * 100)}% del total` : undefined}
          accent="var(--ps-error)"
        />
      </div>

      {/* ── Main grid: Funnel + Leaderboard ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Pipeline funnel */}
        <SectionCard title="Funnel de pipeline">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div style={{ height: 1, background: 'var(--ps-border-subtle)', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--ps-text-secondary)' }}>Perdidos</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ps-error)' }}>{lostCount}</span>
            </div>

            {/* Summary */}
            <div style={{
              marginTop: 4,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--ps-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--ps-text-secondary)' }}>Total activos en pipeline</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ps-cyan)' }}>
                {activeFunnelTotal}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Vendedor leaderboard */}
        <SectionCard title="Ranking de vendedores">
          {leaderboard.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-text-disabled)', textAlign: 'center', padding: '32px 0' }}>
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
              <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--ps-text-disabled)' }}>
                Ordenado por total de leads asignados.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Source breakdown ───────────────────────────────────────────────── */}
      {sourceCounts.length > 0 && (
        <SectionCard title="Leads por canal">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {sourceCounts.map(([source, count]) => {
              const color  = SOURCE_COLORS[source] ?? 'var(--ps-text-secondary)'
              const label  = SOURCE_LABELS[source] ?? source
              const pct    = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0
              return (
                <div
                  key={source}
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'var(--ps-bg-elevated)',
                    border: '1px solid var(--ps-border-subtle)',
                    minWidth: 110,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${color}`,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em' }}>
                      {count}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ps-text-disabled)' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

    </div>
  )
}
