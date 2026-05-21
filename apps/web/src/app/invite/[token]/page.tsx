'use client';

/**
 * Página de aceptación de invitación al equipo — ProSell.
 *
 * Flujo:
 * 1. El usuario hace click en el link del email con el token: /invite/abc123...
 * 2. La página valida el token con el backend
 * 3. El usuario es agregado al equipo
 * 4. Redirección al dashboard con mensaje de bienvenida
 *
 * Estados de error:
 * - Token inválido       → Mostrar error, opción de ir al inicio
 * - Token vencido        → Mostrar error, opción de solicitar nueva invitación
 * - Ya es miembro        → Mostrar mensaje, redirigir al dashboard
 * - No autenticado       → Redirigir al login guardando el token
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { teamApi, ApiError } from '@/lib/api/teamApi';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

type InvitationState = 'loading' | 'success' | 'error' | 'expired' | 'already_member';

// ============================================
// COMPONENT
// ============================================

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<InvitationState>('loading');
  const [message, setMessage] = useState<string>('');
  const [, setTeamName] = useState<string>('');

  const acceptInvitation = useCallback(async () => {
    try {
      const member = await teamApi.acceptInvitation({ token });

      setState('success');
      setTeamName(member.team_id || 'el equipo');
      setMessage('Te uniste exitosamente al equipo.');

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard?welcome=team');
      }, 2000);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('expired')) {
          setState('expired');
          setMessage('Esta invitación venció. Pedile al administrador que te envíe una nueva.');
        } else if (errorMessage.includes('already') || errorMessage.includes('member')) {
          setState('already_member');
          setMessage('Ya sos parte de este equipo.');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else if (error.status === 401) {
          // No autenticado — redirigir al login con return URL
          const returnUrl = encodeURIComponent(`/invite/${token}`);
          router.push(`/auth/login?returnTo=${returnUrl}`);
        } else {
          setState('error');
          setMessage(error.message || 'No se pudo aceptar la invitación. Intentá de nuevo o contactá al soporte.');
        }
      } else {
        setState('error');
        setMessage('Ocurrió un error inesperado. Intentá de nuevo.');
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard pattern, not a cascade
      setState('error');
      setMessage('No se proporcionó el token de invitación');
      return;
    }
    void acceptInvitation();
  }, [token, acceptInvitation]);

  // ── Contenido por estado ──
  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <Loader2
              size={48}
              strokeWidth={1.5}
              style={{ color: 'var(--ps-cyan)', animation: 'spin 0.8s linear infinite' }}
            />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ps-text-secondary)' }}>
              Procesando tu invitación...
            </p>
          </div>
        );

      case 'success':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: 'var(--ps-success)' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-success)' }}>
                ¡Bienvenido al equipo!
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                {message}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ps-text-disabled)' }}>
              Redirigiendo al dashboard...
            </p>
          </div>
        );

      case 'expired':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <XCircle size={48} strokeWidth={1.5} style={{ color: 'var(--ps-error)' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-error)' }}>
                Invitación vencida
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                {message}
              </p>
            </div>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 38,
                padding: '0 20px',
                borderRadius: 8,
                background: 'var(--ps-bg-elevated)',
                border: '1px solid var(--ps-border-default)',
                color: 'var(--ps-text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Ir al inicio
            </Link>
          </div>
        );

      case 'already_member':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <CheckCircle2 size={48} strokeWidth={1.5} style={{ color: 'var(--ps-cyan)' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-cyan)' }}>
                Ya sos miembro
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                {message}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ps-text-disabled)' }}>
              Redirigiendo al dashboard...
            </p>
          </div>
        );

      case 'error':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <AlertCircle size={48} strokeWidth={1.5} style={{ color: 'var(--ps-warning)' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-warning)' }}>
                No pudimos procesar la invitación
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                {message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 8,
                  background: 'var(--ps-bg-elevated)',
                  border: '1px solid var(--ps-border-default)',
                  color: 'var(--ps-text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Ir al inicio
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 8,
                  background: 'var(--ps-cyan)',
                  border: 'none',
                  color: 'var(--ps-bg-base)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        );
    }
  };

  const subtitle = () => {
    if (state === 'loading') return 'Aguardá mientras procesamos tu invitación...'
    if (state === 'success') return 'Invitación aceptada con éxito'
    if (state === 'error' || state === 'expired') return 'No pudimos procesar tu invitación'
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ps-bg-base)',
      padding: '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--ps-text-primary)',
              textDecoration: 'none',
            }}
          >
            ProSell
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          boxShadow: '0 4px 24px rgba(6,13,36,0.3)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--ps-border-default)',
            textAlign: 'center',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--ps-text-primary)',
            }}>
              Invitación al equipo
            </h1>
            {subtitle() && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
                {subtitle()}
              </p>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '28px 28px 32px' }}>
            {renderContent()}
          </div>
        </div>

      </div>
    </div>
  );
}
