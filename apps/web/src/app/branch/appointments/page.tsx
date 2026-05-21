'use client'

/**
 * Branch › Citas — ProSell appointments calendar.
 *
 * Features:
 *   - Full calendar (FullCalendar via CalendarView) with day/week/month/list views
 *   - Today's appointments count badge
 *   - Appointment detail modal on click (confirm/cancel from modal)
 *   - Manual refresh
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAppointments, type Appointment } from '@/lib/api/appointments'
import { CalendarView } from '@/components/appointments/CalendarView'
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal'
import { Calendar, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

export default function BranchAppointmentsPage() {
  const { user } = useAuthStore()

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isModalOpen,         setIsModalOpen]         = useState(false)
  const [isRefreshing,        setIsRefreshing]        = useState(false)

  // user.id is used as user_id (simplified MVP assignment)
  const userId = user?.id ?? ''

  const { data: appointments = [], isLoading, error, refetch } = useAppointments(
    { user_id: userId },
    50,
    0,
  )

  // Count today's appointments
  const today      = new Date()
  const todayStart = startOfDay(today)
  const todayEnd   = endOfDay(today)
  const todayCount = appointments.filter((apt) => {
    const d = parseISO(apt.scheduled_at)
    return d >= todayStart && d <= todayEnd
  }).length

  function handleAppointmentClick(appointment: Appointment) {
    setSelectedAppointment(appointment)
    setIsModalOpen(true)
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader todayCount={0} isRefreshing={false} onRefresh={() => void handleRefresh()} />
        <div
          data-testid="calendar-loading"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 64,
            gap: 10,
            color: 'var(--ps-text-secondary)',
          }}
        >
          <Loader2 size={20} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14 }}>Cargando citas…</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader todayCount={0} isRefreshing={false} onRefresh={() => void handleRefresh()} />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '40px 24px',
          borderRadius: 12,
          background: 'var(--ps-error-bg)',
          border: '1px solid var(--ps-error)',
          textAlign: 'center',
        }}>
          <AlertCircle size={24} strokeWidth={2} style={{ color: 'var(--ps-error)' }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ps-error)' }}>
              Error al cargar las citas
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
              {error.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            style={{
              height: 34,
              padding: '0 16px',
              background: 'var(--ps-bg-elevated)',
              border: '1px solid var(--ps-border-default)',
              borderRadius: 8,
              color: 'var(--ps-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <PageHeader
        todayCount={todayCount}
        isRefreshing={isRefreshing}
        onRefresh={() => void handleRefresh()}
      />

      {/* Calendar container */}
      <div style={{
        background: 'var(--ps-bg-surface)',
        border: '1px solid var(--ps-border-default)',
        borderRadius: 12,
        padding: 24,
        overflow: 'hidden',
      }}>
        <CalendarView
          appointments={appointments}
          userId={userId}
          onAppointmentClick={handleAppointmentClick}
        />
      </div>

      {/* Appointment detail modal */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setSelectedAppointment(null)
        }}
      />
    </div>
  )
}

// ─── Page header (extracted to avoid duplication in loading/error states) ──────

function PageHeader({
  todayCount,
  isRefreshing,
  onRefresh,
}: {
  todayCount: number
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ps-text-primary)',
            lineHeight: 1.2,
          }}>
            Citas
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Agenda y seguimiento de citas de la sucursal.
          </p>
        </div>

        {/* Today badge */}
        {todayCount > 0 && (
          <div
            data-testid="today-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 99,
              background: 'var(--ps-info-bg)',
              border: '1px solid rgba(77,184,255,0.2)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ps-cyan)',
              marginTop: 4,
              flexShrink: 0,
            }}
          >
            <Calendar size={12} strokeWidth={2} />
            {todayCount} hoy
          </div>
        )}
      </div>

      {/* Refresh button */}
      <button
        type="button"
        onClick={onRefresh}
        data-testid="refresh-button"
        style={{
          width: 36,
          height: 36,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ps-bg-elevated)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 8,
          color: 'var(--ps-text-secondary)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--ps-border-medium)'
          e.currentTarget.style.color = 'var(--ps-text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--ps-border-default)'
          e.currentTarget.style.color = 'var(--ps-text-secondary)'
        }}
      >
        <RefreshCw
          size={14}
          strokeWidth={2}
          style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
        />
      </button>
    </div>
  )
}
