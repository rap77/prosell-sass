'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useLeads, useTeamMetrics, LeadStatus } from '@/lib/api/leads'
import {
  Inbox,
  Briefcase,
  TrendingUp,
  BarChart3,
  Plus,
  ChevronRight,
} from 'lucide-react'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function formatRelativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `hace ${diffHr} hora${diffHr > 1 ? 's' : ''}`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'ayer'
  return `hace ${diffDays} días`
}

const AVATAR_GRADIENTS: [string, string][] = [
  ['#4DB8FF', '#1E5FD4'],
  ['#22D3A0', '#1E5FD4'],
  ['#F5A623', '#F04438'],
  ['#7DCEFF', '#4DB8FF'],
  ['#9C5CF7', '#1E5FD4'],
  ['#0D1B6E', '#4DB8FF'],
]

function getAvatarGradient(id: string): [string, string] {
  const code = id.charCodeAt(0) + (id.charCodeAt(id.length - 1) || 0)
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]
}

function getSourceStyle(source: string): { bg: string; color: string; label: string } {
  const s = source.toLowerCase()
  if (s.includes('facebook') || s === 'fb')
    return { bg: 'rgba(77,184,255,0.15)', color: 'var(--ps-cyan)', label: 'FB' }
  if (s.includes('autotrader') || s === 'at')
    return { bg: 'rgba(245,166,35,0.15)', color: 'var(--ps-warning)', label: 'AT' }
  const label = source.length > 3 ? source.substring(0, 2).toUpperCase() : source.toUpperCase()
  return { bg: 'rgba(34,211,160,0.15)', color: 'var(--ps-success)', label }
}

const STATUS_BADGE: Record<LeadStatus, { bg: string; color: string; label: string }> = {
  [LeadStatus.NEW]:             { bg: 'rgba(77,184,255,0.14)',  color: 'var(--ps-cyan)',             label: 'Nuevo' },
  [LeadStatus.CONTACTED]:       { bg: 'rgba(245,166,35,0.12)',  color: 'var(--ps-warning)',          label: 'Contactado' },
  [LeadStatus.QUALIFIED]:       { bg: 'rgba(34,211,160,0.12)',  color: 'var(--ps-success)',          label: 'Calificado' },
  [LeadStatus.APPOINTMENT_SET]: { bg: 'rgba(34,211,160,0.18)',  color: 'var(--ps-success)',          label: 'Con cita' },
  [LeadStatus.LOST]:            { bg: 'rgba(138,155,191,0.12)', color: 'var(--ps-text-secondary)',   label: 'Perdido' },
}

const PIPELINE_STAGES = [
  { status: LeadStatus.NEW,             label: 'Nuevo',      fill: 'linear-gradient(90deg, var(--ps-navy), var(--ps-blue))' },
  { status: LeadStatus.CONTACTED,       label: 'Contactado', fill: 'linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))' },
  { status: LeadStatus.QUALIFIED,       label: 'Calificado', fill: 'linear-gradient(90deg, var(--ps-cyan), var(--ps-cyan-hover))', glow: 'rgba(77,184,255,0.4)' },
  { status: LeadStatus.APPOINTMENT_SET, label: 'Con cita',   fill: 'linear-gradient(90deg, var(--ps-success), #5BE6BC)',          glow: 'rgba(34,211,160,0.4)' },
] as const

// ─── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ background: 'var(--ps-bg-surface)', border: '1px solid var(--ps-border-subtle)', borderRadius: 12, padding: 20, ...style }}>
      {children}
    </section>
  )
}

function CardHead({ title, linkLabel, linkHref }: { title: string; linkLabel?: string; linkHref?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ps-text-primary)' }}>{title}</h3>
      {linkLabel && linkHref && (
        <Link href={linkHref} style={{ fontSize: 12, color: 'var(--ps-cyan)', fontWeight: 500, textDecoration: 'none' }}>
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.first_name ?? 'Vendedor'
  const greeting  = getGreeting()

  // Cap at 100 to stay within ListLeadsRequest DTO limit (le=100)
  const { data: allLeads = [], isLoading: leadsLoading } = useLeads(undefined, 100)
  const { data: metrics,        isLoading: metricsLoading } = useTeamMetrics()

  const isLoading = leadsLoading || metricsLoading

  const recentLeads = useMemo(
    () =>
      [...allLeads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [allLeads]
  )

  const pipelineCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      [LeadStatus.NEW]: 0, [LeadStatus.CONTACTED]: 0,
      [LeadStatus.QUALIFIED]: 0, [LeadStatus.APPOINTMENT_SET]: 0, [LeadStatus.LOST]: 0,
    }
    for (const l of allLeads) counts[l.status]++
    return counts
  }, [allLeads])

  const activeLeads      = allLeads.filter(l => l.status !== LeadStatus.LOST).length
  const maxPipelineCount = Math.max(...PIPELINE_STAGES.map(s => pipelineCounts[s.status]), 1)
  const newLeadsToday    = metrics?.new_leads_last_24h ?? 0
  const totalLeads       = metrics?.total_leads ?? allLeads.length
  const conversionPct    = metrics ? `${(metrics.conversion_rate * 100).toFixed(0)}%` : '—'

  const KPIS = [
    { label: 'Leads hoy',     value: isLoading ? '—' : String(newLeadsToday), delta: 'últimas 24 horas',   trend: 'up'   as const, Icon: Inbox },
    { label: 'Conversión',    value: isLoading ? '—' : conversionPct,          delta: 'nuevo → cita',       trend: 'up'   as const, Icon: TrendingUp },
    { label: 'Leads activos', value: isLoading ? '—' : String(activeLeads),   delta: 'en pipeline activo', trend: 'warn' as const, Icon: Briefcase },
    { label: 'Total leads',   value: isLoading ? '—' : String(totalLeads),    delta: 'desde el inicio',    trend: 'up'   as const, Icon: BarChart3 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--ps-text-primary)' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Hoy ·{' '}
            <b style={{ color: 'var(--ps-text-primary)', fontWeight: 600 }}>
              {isLoading ? '…' : `${newLeadsToday} lead${newLeadsToday !== 1 ? 's' : ''} nuevo${newLeadsToday !== 1 ? 's' : ''}`}
            </b>
          </p>
        </div>

        <Link
          href="/publications"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--ps-cyan)', color: 'var(--ps-bg-base)',
            padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
            textDecoration: 'none', transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ps-cyan-hover)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(77,184,255,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ps-cyan)'; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva publicación
        </Link>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {KPIS.map(({ label, value, delta, trend, Icon }) => (
          <div
            key={label}
            style={{
              position: 'relative', background: 'var(--ps-bg-surface)',
              border: '1px solid var(--ps-border-subtle)', borderRadius: 12,
              padding: 20, display: 'flex', flexDirection: 'column', gap: 6,
              transition: 'border-color 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-medium)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-subtle)')}
          >
            <div style={{
              position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 8,
              background: 'rgba(77,184,255,0.10)', border: '1px solid rgba(77,184,255,0.18)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ps-cyan)',
            }}>
              <Icon size={16} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--ps-text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ps-text-primary)', margin: '2px 0 4px', fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: trend === 'up' ? 'var(--ps-success)' : 'var(--ps-warning)' }}>
              {delta}
            </span>
          </div>
        ))}
      </div>

      {/* ── Two-column section ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16 }}>

        {/* Leads recientes */}
        <Card>
          <CardHead title="Leads recientes" linkLabel="Ver todos →" linkHref="/vendedor/leads" />

          {isLoading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ps-text-secondary)', fontSize: 13 }}>
              Cargando…
            </div>
          ) : recentLeads.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ps-text-secondary)', fontSize: 13 }}>
              No hay leads aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentLeads.map((lead) => {
                const ss  = STATUS_BADGE[lead.status]
                const src = getSourceStyle(lead.source)
                const [g1, g2] = getAvatarGradient(lead.id)
                return (
                  <a
                    key={lead.id}
                    href="/vendedor/leads"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', transition: 'background 180ms', minWidth: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ps-table-row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--ps-bg-base)', flexShrink: 0, background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      {getInitials(lead.buyer_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ps-text-primary)', minWidth: 0 }}>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.buyer_name}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em', background: src.bg, color: src.color, flexShrink: 0 }}>
                          {src.label}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--ps-text-disabled)', fontFamily: 'ui-monospace, monospace' }}>
                        {formatRelativeTime(lead.created_at)}
                      </span>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 100, whiteSpace: 'nowrap', background: ss.bg, color: ss.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                      {ss.label}
                    </span>
                    <span style={{ color: 'var(--ps-text-disabled)', display: 'inline-flex' }}>
                      <ChevronRight size={16} strokeWidth={2} />
                    </span>
                  </a>
                )
              })}
            </div>
          )}

          <div style={{ textAlign: 'center', paddingTop: 12, marginTop: 8, borderTop: '1px solid var(--ps-border-subtle)' }}>
            <Link href="/vendedor/leads" style={{ fontSize: 13, color: 'var(--ps-cyan)', fontWeight: 500, textDecoration: 'none' }}>
              Ver todos los leads →
            </Link>
          </div>
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Pipeline */}
          <Card>
            <CardHead title="Pipeline" linkLabel="Ver completo →" linkHref="/pipeline" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PIPELINE_STAGES.map((stage) => {
                const count = pipelineCounts[stage.status]
                const pct   = Math.round((count / maxPipelineCount) * 100)
                return (
                  <div key={stage.status} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 44px', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)' }}>{stage.label}</span>
                    <div style={{ height: 8, borderRadius: 100, background: 'rgba(77,184,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 100, width: `${pct}%`, background: stage.fill, boxShadow: 'glow' in stage ? `0 0 10px ${stage.glow}` : 'none' }} />
                    </div>
                    <span style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: 'var(--ps-text-primary)', letterSpacing: '-0.01em' }}>
                      {isLoading ? '—' : count}
                    </span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ps-border-subtle)', fontSize: 12, color: 'var(--ps-text-secondary)' }}>
              <b style={{ color: 'var(--ps-text-primary)', fontWeight: 600 }}>
                {isLoading ? '—' : activeLeads} lead{activeLeads !== 1 ? 's' : ''}
              </b>{' '}activos
            </div>
          </Card>

          {/* Equipo */}
          <Card>
            <CardHead title="Equipo · Leads" />
            {isLoading ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--ps-text-secondary)', fontSize: 13 }}>Cargando…</div>
            ) : !metrics?.vendedor_breakdown?.length ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--ps-text-secondary)', fontSize: 13 }}>Sin vendedores asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metrics.vendedor_breakdown.slice(0, 5).map((v) => {
                  const [g1, g2] = getAvatarGradient(v.vendedor_id)
                  return (
                    <div key={v.vendedor_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
                      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: `linear-gradient(135deg, ${g1}, ${g2})`, color: 'var(--ps-bg-base)' }}>
                        {getInitials(v.vendedor_name)}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ps-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.vendedor_name}
                      </span>
                      <span style={{ fontSize: 12.5, fontFamily: 'ui-monospace, monospace', color: 'var(--ps-text-secondary)', flexShrink: 0 }}>
                        {v.total_leads} lead{v.total_leads !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

    </div>
  )
}
