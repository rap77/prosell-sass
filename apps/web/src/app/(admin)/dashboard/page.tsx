'use client'

/**
 * ProSell Dashboard — Seller view
 *
 * KPI row · Leads recientes · Pipeline · Canales · Actividad reciente
 * All design tokens via var(--ps-*) → instant dark/light theme switching.
 *
 * TODO: Add role-based split (seller vs. admin) via middleware once auth flow
 *       is fully wired.  Admin-specific stats live at /admin for now.
 */

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  Inbox,
  Zap,
  Briefcase,
  TrendingUp,
  Flag,
  Plus,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  Megaphone,
  User,
} from 'lucide-react'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// ─── Static sample data ───────────────────────────────────────────────────────
// TODO: replace with real API calls once /api/v1/dashboard/summary is ready

const KPIS = [
  { label: 'Leads hoy',         value: '12',   delta: '+4 vs ayer',         trend: 'up',   Icon: Inbox },
  { label: 'Respondidos < 60s', value: '91%',  delta: '+3pp esta semana',   trend: 'up',   Icon: Zap },
  { label: 'Deals abiertos',    value: '47',   delta: '8 en cierre',        trend: 'warn', Icon: Briefcase },
  { label: 'Revenue este mes',  value: '$84K', delta: '+12.4% vs mes ant.', trend: 'up',   Icon: TrendingUp },
] as const

const LEADS = [
  { initials: 'MR', grad: ['#4DB8FF','#1E5FD4'], name: 'Martín Rivas',   src: 'FB',      time: 'hace 2 min',  status: 'new',  label: 'Nuevo' },
  { initials: 'JC', grad: ['#22D3A0','#1E5FD4'], name: 'Julieta Castro', src: 'AT',      time: 'hace 12 min', status: 'ok',   label: 'Respondido' },
  { initials: 'SP', grad: ['#F5A623','#F04438'], name: 'Sofía Paz',      src: 'Directo', time: 'hace 28 min', status: 'pend', label: 'Pendiente' },
  { initials: 'AL', grad: ['#7DCEFF','#4DB8FF'], name: 'Andrés López',   src: 'FB',      time: 'hace 47 min', status: 'ok',   label: 'Respondido' },
  { initials: 'CR', grad: ['#0D1B6E','#1E5FD4'], name: 'Carlos Ríos',    src: 'AT',      time: 'hace 1 hora', status: 'pend', label: 'Pendiente' },
]

const PIPELINE = [
  { stage: 'Nuevo',      count: 18, pct: 50, fill: 'linear-gradient(90deg, var(--ps-navy), var(--ps-blue))', glow: false },
  { stage: 'Contactado', count: 14, pct: 75, fill: 'linear-gradient(90deg, var(--ps-blue), var(--ps-cyan))', glow: false },
  { stage: 'Demo',       count: 9,  pct: 50, fill: 'linear-gradient(90deg, var(--ps-cyan), var(--ps-cyan-hover))', glow: true, glowColor: 'rgba(77,184,255,0.4)' },
  { stage: 'Cierre',     count: 6,  pct: 25, fill: 'linear-gradient(90deg, var(--ps-success), #5BE6BC)', glow: true, glowColor: 'rgba(34,211,160,0.4)' },
]

const CHANNELS = [
  { name: 'Facebook',   count: '8 leads', active: true,  logoBg: '#1877F2',            logoColor: '#fff',              label: 'f' },
  { name: 'AutoTrader', count: '3 leads', active: true,  logoBg: '#FF6600',            logoColor: '#fff',              label: 'AT' },
  { name: 'Sitio web',  count: '1 lead',  active: false, logoBg: 'var(--ps-navy)',     logoColor: 'var(--ps-cyan)',     label: '◈' },
]

const ACTIVITY = [
  { Icon: UserPlus,     color: { bg: 'rgba(34,211,160,0.12)',  fg: 'var(--ps-success)' },           text: 'Nuevo lead de Facebook',           meta: '· Toyota Hilux 2023',  time: 'hace 5 min' },
  { Icon: Zap,          color: { bg: 'rgba(77,184,255,0.12)',  fg: 'var(--ps-cyan)' },              text: 'Respondido automáticamente',        meta: '· Juliana C.',          time: 'hace 12 min' },
  { Icon: CheckCircle2, color: { bg: 'rgba(34,211,160,0.16)',  fg: 'var(--ps-success)' },           text: 'Deal cerrado · $28.500',            meta: '· Acme Motors',         time: 'hace 1 hora' },
  { Icon: Megaphone,    color: { bg: 'rgba(30,95,212,0.18)',   fg: 'var(--ps-cyan-hover)' },        text: 'Publicación activa en 4 canales',   meta: '· Corolla 2024',        time: 'hace 2 horas' },
  { Icon: User,         color: { bg: 'rgba(138,155,191,0.12)', fg: 'var(--ps-text-secondary)' },    text: 'Martín R.',                          meta: 'invitado al equipo',    time: 'ayer' },
]

// ─── Badge lookup maps ─────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  new:  { bg: 'rgba(77,184,255,0.14)',  color: 'var(--ps-cyan)' },
  ok:   { bg: 'rgba(34,211,160,0.12)',  color: 'var(--ps-success)' },
  pend: { bg: 'rgba(245,166,35,0.12)',  color: 'var(--ps-warning)' },
}

const SRC_STYLE: Record<string, { bg: string; color: string }> = {
  FB:      { bg: 'rgba(77,184,255,0.15)',  color: 'var(--ps-cyan)' },
  AT:      { bg: 'rgba(245,166,35,0.15)',  color: 'var(--ps-warning)' },
  Directo: { bg: 'rgba(34,211,160,0.15)',  color: 'var(--ps-success)' },
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────

function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section
      style={{
        background: 'var(--ps-bg-surface)',
        border: '1px solid var(--ps-border-subtle)',
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

function CardHead({
  title,
  linkLabel,
  linkHref,
}: {
  title: string
  linkLabel?: string
  linkHref?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
        {title}
      </h3>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          style={{ fontSize: 12, color: 'var(--ps-cyan)', fontWeight: 500, textDecoration: 'none' }}
        >
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{
            margin: '0 0 4px',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--ps-text-primary)',
          }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Hoy ·{' '}
            <b style={{ color: 'var(--ps-text-primary)', fontWeight: 600 }}>3 leads nuevos</b>
          </p>
        </div>

        <Link
          href="/publications/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ps-cyan)',
            color: 'var(--ps-bg-base)',
            padding: '9px 16px',
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ps-cyan-hover)'
            e.currentTarget.style.boxShadow  = '0 6px 20px rgba(77,184,255,0.3)'
            e.currentTarget.style.transform  = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--ps-cyan)'
            e.currentTarget.style.boxShadow  = ''
            e.currentTarget.style.transform  = ''
          }}
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
              position: 'relative',
              background: 'var(--ps-bg-surface)',
              border: '1px solid var(--ps-border-subtle)',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'border-color 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-medium)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ps-border-subtle)')}
          >
            {/* Icon badge */}
            <div style={{
              position: 'absolute', top: 18, right: 18,
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(77,184,255,0.10)',
              border: '1px solid rgba(77,184,255,0.18)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ps-cyan)',
            }}>
              <Icon size={16} strokeWidth={2} />
            </div>

            <span style={{ fontSize: 13, color: 'var(--ps-text-secondary)' }}>{label}</span>

            <span style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: 'var(--ps-text-primary)',
              margin: '2px 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </span>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600,
              color: trend === 'up' ? 'var(--ps-success)' : 'var(--ps-warning)',
            }}>
              {trend === 'up'
                ? <TrendingUp size={12} strokeWidth={2.5} />
                : <Flag size={12} strokeWidth={2.5} />}
              {delta}
            </span>
          </div>
        ))}
      </div>

      {/* ── Two-column section ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>

        {/* Leads recientes */}
        <Card>
          <CardHead title="Leads recientes" linkLabel="Ver todos →" linkHref="/leads" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {LEADS.map((lead, i) => {
              const ss = STATUS_STYLE[lead.status]
              const src = SRC_STYLE[lead.src] ?? SRC_STYLE['Directo']
              return (
                <a
                  key={i}
                  href="/leads"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    transition: 'background 180ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ps-table-row-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                    color: 'var(--ps-bg-base)',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${lead.grad[0]}, ${lead.grad[1]})`,
                  }}>
                    {lead.initials}
                  </div>

                  {/* Name + time */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
                      {lead.name}
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        letterSpacing: '0.04em',
                        background: src.bg, color: src.color,
                      }}>
                        {lead.src}
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--ps-text-disabled)', fontFamily: 'ui-monospace, monospace' }}>
                      {lead.time}
                    </span>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 600,
                    padding: '4px 10px', borderRadius: 100,
                    whiteSpace: 'nowrap',
                    background: ss.bg, color: ss.color,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {lead.label}
                  </span>

                  {/* Arrow */}
                  <span style={{ color: 'var(--ps-text-disabled)', display: 'inline-flex' }}>
                    <ChevronRight size={16} strokeWidth={2} />
                  </span>
                </a>
              )
            })}
          </div>

          <div style={{
            textAlign: 'center', paddingTop: 12, marginTop: 8,
            borderTop: '1px solid var(--ps-border-subtle)',
          }}>
            <Link href="/leads" style={{ fontSize: 13, color: 'var(--ps-cyan)', fontWeight: 500, textDecoration: 'none' }}>
              Ver los 12 leads de hoy →
            </Link>
          </div>
        </Card>

        {/* Right column: Pipeline + Canales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Pipeline */}
          <Card>
            <CardHead title="Pipeline" linkLabel="Ver completo →" linkHref="/pipeline" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PIPELINE.map((row) => (
                <div key={row.stage} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 44px', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
                    {row.stage}
                  </span>
                  <div style={{ height: 8, borderRadius: 100, background: 'rgba(77,184,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 100,
                      width: `${row.pct}%`,
                      background: row.fill,
                      boxShadow: row.glow ? `0 0 10px ${row.glowColor}` : 'none',
                    }} />
                  </div>
                  <span style={{
                    textAlign: 'right', fontSize: 12.5, fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--ps-text-primary)',
                    letterSpacing: '-0.01em',
                  }}>
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px solid var(--ps-border-subtle)',
              fontSize: 12, color: 'var(--ps-text-secondary)',
            }}>
              <b style={{ color: 'var(--ps-text-primary)', fontWeight: 600 }}>47 deals</b> activos
            </div>
          </Card>

          {/* Canales */}
          <Card>
            <CardHead title="Canales · Hoy" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CHANNELS.map((ch) => (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px' }}>
                  <div style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em',
                    background: ch.logoBg, color: ch.logoColor,
                  }}>
                    {ch.label}
                  </div>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'var(--ps-text-primary)' }}>
                    {ch.name}
                  </span>
                  <span style={{ fontSize: 12.5, fontFamily: 'ui-monospace, monospace', color: 'var(--ps-text-secondary)' }}>
                    {ch.count}
                  </span>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ch.active ? 'var(--ps-success)' : 'var(--ps-text-disabled)',
                    boxShadow: ch.active ? '0 0 6px var(--ps-success)' : 'none',
                  }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Actividad reciente ────────────────────────────────────────────── */}
      <Card>
        <CardHead title="Actividad reciente" linkLabel="Ver todo →" linkHref="#" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ACTIVITY.map(({ Icon, color, text, meta, time }, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 12px', borderRadius: 8,
                transition: 'background 180ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ps-table-row-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Icon badge */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: color.bg, color: color.fg,
              }}>
                <Icon size={15} strokeWidth={2} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ps-text-primary)', lineHeight: 1.45 }}>
                <b style={{ fontWeight: 600 }}>{text}</b>
                {' '}
                <span style={{ color: 'var(--ps-text-secondary)', fontWeight: 400 }}>{meta}</span>
              </div>

              {/* Timestamp */}
              <span style={{
                fontSize: 11, color: 'var(--ps-text-disabled)',
                fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
              }}>
                {time}
              </span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
