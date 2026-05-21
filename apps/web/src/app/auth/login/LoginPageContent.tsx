'use client'

/**
 * LoginPageContent — ProSell login screen.
 * Uses AuthShell for the split brand+form layout.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import {
  AuthShell,
  AuthFormHead,
  AuthFieldError,
  AuthErrorBanner,
  AuthDivider,
  AuthSubmitButton,
  authInputStyle,
  focusAuthInput,
  blurAuthInput,
} from '@/components/auth/AuthShell'

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().min(1, 'El email es requerido').email('El email no es válido'),
  password: z.string().min(1, 'La contraseña es requerida').min(8, 'Mínimo 8 caracteres'),
})
type LoginValues = z.infer<typeof loginSchema>

// ─── OAuth SVG icons ──────────────────────────────────────────────────────────

function GoogleSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.5l2.64-2.55C16.83 3.4 14.66 2.4 12 2.4 6.78 2.4 2.6 6.58 2.6 11.8s4.18 9.4 9.4 9.4c5.43 0 9.02-3.82 9.02-9.2 0-.62-.07-1.1-.15-1.6H12z" />
    </svg>
  )
}

function MicrosoftSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2"  y="2"  width="9" height="9" fill="#F25022" />
      <rect x="13" y="2"  width="9" height="9" fill="#7FBA00" />
      <rect x="2"  y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function OAuthBtn({ label, icon, loading, onClick }: {
  label: string; icon: React.ReactNode; loading: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        height: 40,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: 'transparent',
        border: '1px solid var(--ps-input-border)',
        borderRadius: 8,
        color: 'var(--ps-text-secondary)',
        fontSize: 13, fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'border-color 180ms, color 180ms, background 180ms',
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ps-border-strong)'
        e.currentTarget.style.color       = 'var(--ps-text-primary)'
        e.currentTarget.style.background  = 'var(--ps-hover-bg-xs)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ps-input-border)'
        e.currentTarget.style.color       = 'var(--ps-text-secondary)'
        e.currentTarget.style.background  = 'transparent'
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoginPageContent() {
  const { login, isLoading, error, clearError } = useAuth()
  const router                    = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPw, setShowPw]       = useState(false)
  const [loadingOAuth, setLoadingOAuth] = useState<string | null>(null)

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginValues>({
      resolver: zodResolver(loginSchema),
      mode: 'onBlur',
      defaultValues: { email: '', password: '' },
    })

  const isDisabled = isLoading || isSubmitting || isPending

  const onSubmit = async (data: LoginValues) => {
    if (isDisabled) return
    startTransition(async () => {
      try {
        await login(data.email, data.password)
        router.push('/dashboard')
      } catch { /* error set in auth store */ }
    })
  }

  return (
    <AuthShell>
      <AuthFormHead title="Bienvenido de vuelta" subtitle="Ingresá tu cuenta para continuar" />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-secondary)' }}>
            Email
          </label>
          <input
            {...register('email', { onChange: () => error && clearError() })}
            id="email"
            type="email"
            placeholder="vos@empresa.com"
            autoComplete="email"
            disabled={isDisabled}
            aria-invalid={!!errors.email}
            style={authInputStyle(!!errors.email)}
            onFocus={(e) => focusAuthInput(e.currentTarget, !!errors.email)}
            onBlur={(e)  => blurAuthInput(e.currentTarget, !!errors.email)}
          />
          {errors.email && <AuthFieldError message={errors.email.message ?? ''} />}
        </div>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-secondary)' }}>
              Contraseña
            </label>
            <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--ps-cyan)', textDecoration: 'none', fontWeight: 500 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isDisabled}
                    value={field.value}
                    style={{ ...authInputStyle(!!fieldState.error), paddingRight: 44 }}
                    onFocus={(e) => focusAuthInput(e.currentTarget, !!fieldState.error)}
                    onBlur={(e)  => { blurAuthInput(e.currentTarget, !!fieldState.error); field.onBlur() }}
                    onChange={(e) => { field.onChange(e.target.value); if (error) clearError() }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 0, borderRadius: 6, color: 'var(--ps-text-secondary)', cursor: 'pointer', transition: 'color 180ms' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ps-text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ps-text-secondary)')}
                  >
                    {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
                {fieldState.error && <AuthFieldError message={fieldState.error.message ?? ''} />}
              </div>
            )}
          />
        </div>

        {error && <AuthErrorBanner message={error.message} />}

        <AuthSubmitButton
          label="Iniciar sesión"
          loadingLabel="Ingresando..."
          isLoading={isLoading || isPending}
          disabled={isDisabled}
        />

        {/* Arrow icon on button — overlaid via absolute would be complex;
            we pass an extra element after the button for the arrow treatment */}
      </form>

      <AuthDivider label="o continuá con" />

      {/* OAuth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <OAuthBtn label="Google" icon={<GoogleSvg />} loading={loadingOAuth === 'google'}
          onClick={() => { setLoadingOAuth('google'); const b = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'; window.location.href = `${b}/api/auth/oauth/google/authorize` }} />
        <OAuthBtn label="Microsoft" icon={<MicrosoftSvg />} loading={loadingOAuth === 'microsoft'}
          onClick={() => { setLoadingOAuth('microsoft'); const b = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'; window.location.href = `${b}/api/auth/oauth/microsoft/authorize` }} />
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ps-text-secondary)', margin: 0 }}>
        ¿No tenés cuenta?
        <Link href="/auth/register" style={{ color: 'var(--ps-cyan)', textDecoration: 'none', fontWeight: 600, marginLeft: 4 }}>
          Registrate gratis →
        </Link>
      </p>
    </AuthShell>
  )
}
