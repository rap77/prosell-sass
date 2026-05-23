'use client'

/**
 * Settings › Seguridad — ProSell security settings.
 *
 * Sections:
 *   1. Change password (react-hook-form + zod + useChangePassword)
 *   2. Two-factor authentication (useDisableTwoFactor + TOTP confirm dialog)
 *
 * All colors via var(--ps-*) tokens — dark/light automatic.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, ShieldCheck, Loader2, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'
import type { UseFormRegisterReturn } from 'react-hook-form'
import {
  useChangePassword,
  useDisableTwoFactor,
  mapSecurityErrorMessage,
} from '@/lib/api/userApi'
import { useAuth } from '@/hooks/useAuth'

// ─── Schema ───────────────────────────────────────────────────────────────────

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword:     z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmá tu nueva contraseña'),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'La confirmación no coincide con la nueva contraseña',
      })
    }
    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'La nueva contraseña debe ser diferente a la actual',
      })
    }
  })

type SecurityFormValues = z.infer<typeof securitySchema>

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 40px 0 12px',  // right padding for show/hide icon
  background: 'var(--ps-input-bg)',
  border: '1px solid var(--ps-input-border)',
  borderRadius: 8,
  color: 'var(--ps-text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 150ms, box-shadow 150ms',
}

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--ps-cyan)'
  e.currentTarget.style.boxShadow = 'var(--ps-input-focus-shadow)'
}
function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--ps-input-border)'
  e.currentTarget.style.boxShadow = 'none'
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  id, label, hint, error, children,
}: {
  id: string; label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--ps-text-primary)' }}>
        {label}
      </label>
      {children}
      {hint && !error && <p style={{ margin: 0, fontSize: 12, color: 'var(--ps-text-secondary)' }}>{hint}</p>}
      {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--ps-error)' }}>{error}</p>}
    </div>
  )
}

// ─── Password field with show/hide toggle ─────────────────────────────────────

function PwField({
  id,
  label,
  hint,
  error,
  registration,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  registration: UseFormRegisterReturn
}) {
  const [show, setShow] = useState(false)
  const { onBlur: rhfOnBlur, ...restReg } = registration
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
          style={inputBase}
          {...restReg}
          onFocus={focusInput}
          onBlur={(e) => { blurInput(e); void rhfOnBlur(e) }}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); setShow((v) => !v) }}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--ps-text-disabled)',
            display: 'flex',
          }}
        >
          {show ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
        </button>
      </div>
    </Field>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: 'var(--ps-border-subtle)', margin: '8px 0' }} />
}

// ─── Disable 2FA modal ────────────────────────────────────────────────────────

function Disable2FAModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (code: string) => void
  isPending: boolean
}) {
  const [code, setCode] = useState('')

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6,13,36,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--ps-bg-surface)',
          border: '1px solid var(--ps-border-default)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 24px 64px rgba(6,13,36,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ps-text-primary)' }}>
              Deshabilitar 2FA
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)', lineHeight: 1.5 }}>
              Confirmá el código de tu aplicación autenticadora para desactivar la protección de dos factores.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ps-text-disabled)', padding: 4, display: 'flex', flexShrink: 0 }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* TOTP input */}
        <Field id="totp-code" label="Código TOTP" hint="Ingresá el código actual de 6 dígitos generado por tu app.">
          <input
            id="totp-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{
              ...inputBase,
              padding: '0 12px',
              letterSpacing: '0.2em',
              fontSize: 18,
              fontWeight: 600,
              textAlign: 'center',
            }}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </Field>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
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
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending || code.trim().length !== 6}
            onClick={() => onConfirm(code)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 16px',
              background: 'var(--ps-error)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: isPending || code.trim().length !== 6 ? 'not-allowed' : 'pointer',
              opacity: isPending || code.trim().length !== 6 ? 0.65 : 1,
            }}
          >
            {isPending && <Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {isPending ? 'Deshabilitando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsSecurityPage() {
  const router        = useRouter()
  const { is2FAEnabled, updateUser } = useAuth()
  const changePassword  = useChangePassword()
  const disableTwoFactor = useDisableTwoFactor()
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      })
      toast.success('Contraseña actualizada', {
        description: 'Tu contraseña se guardó correctamente.',
      })
      form.reset()
    } catch (error) {
      toast.error('No se pudo actualizar la contraseña', {
        description: error instanceof Error
          ? mapSecurityErrorMessage(error.message)
          : 'Inténtalo de nuevo en unos segundos.',
      })
    }
  })

  async function handleDisable2FA(code: string) {
    try {
      await disableTwoFactor.mutateAsync({ totpCode: code })
      updateUser({ is_2fa_enabled: false })
      setDialogOpen(false)
      toast.success('2FA deshabilitado', {
        description: 'Tu cuenta volvió a usar solo contraseña.',
      })
    } catch (error) {
      toast.error('No se pudo deshabilitar 2FA', {
        description: error instanceof Error
          ? mapSecurityErrorMessage(error.message)
          : 'No se pudo deshabilitar 2FA.',
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Change password ─────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            Seguridad
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Protegé tu acceso con una contraseña robusta y autenticación de dos factores.
          </p>
        </div>

        <Divider />

        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            Cambiar contraseña
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Usá una contraseña nueva con al menos 8 caracteres.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PwField
            id="currentPassword"
            label="Contraseña actual"
            error={form.formState.errors.currentPassword?.message}
            registration={form.register('currentPassword')}
          />

          <PwField
            id="newPassword"
            label="Nueva contraseña"
            hint="Debe incluir mayúsculas, minúsculas, números y un carácter especial."
            error={form.formState.errors.newPassword?.message}
            registration={form.register('newPassword')}
          />

          <PwField
            id="confirmPassword"
            label="Confirmar nueva contraseña"
            error={form.formState.errors.confirmPassword?.message}
            registration={form.register('confirmPassword')}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="submit"
              disabled={changePassword.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 38,
                padding: '0 20px',
                background: changePassword.isPending ? 'rgba(77,184,255,0.6)' : 'var(--ps-cyan)',
                color: 'var(--ps-bg-base)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: changePassword.isPending ? 'not-allowed' : 'pointer',
                transition: 'background 150ms',
              }}
            >
              {changePassword.isPending && (
                <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
              )}
              {changePassword.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </section>

      <Divider />

      {/* ── Two-factor authentication ───────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
            Autenticación de dos factores
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ps-text-secondary)' }}>
            Agregá una capa adicional de seguridad a tu cuenta.
          </p>
        </div>

        {/* Status card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          padding: '16px 18px',
          borderRadius: 10,
          background: 'var(--ps-bg-elevated)',
          border: '1px solid var(--ps-border-subtle)',
        }}>
          {/* Left: icon + status text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: is2FAEnabled ? 'rgba(52,211,153,0.12)' : 'var(--ps-bg-surface)',
              border: `1px solid ${is2FAEnabled ? 'rgba(52,211,153,0.25)' : 'var(--ps-border-default)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {is2FAEnabled
                ? <ShieldCheck size={18} strokeWidth={2} style={{ color: 'var(--ps-success)' }} />
                : <Shield      size={18} strokeWidth={2} style={{ color: 'var(--ps-text-disabled)' }} />
              }
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ps-text-primary)' }}>
                {is2FAEnabled ? '2FA habilitado' : '2FA deshabilitado'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ps-text-secondary)' }}>
                {is2FAEnabled
                  ? 'Tu cuenta requiere un código adicional al iniciar sesión.'
                  : 'Activalo para proteger mejor el acceso a tu cuenta.'}
              </p>
            </div>
          </div>

          {/* Right: action button */}
          {is2FAEnabled ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              style={{
                height: 34,
                padding: '0 14px',
                background: 'var(--ps-bg-surface)',
                border: '1px solid var(--ps-border-default)',
                borderRadius: 8,
                color: 'var(--ps-text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'border-color 150ms, color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--ps-error)'
                e.currentTarget.style.color = 'var(--ps-error)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ps-border-default)'
                e.currentTarget.style.color = 'var(--ps-text-secondary)'
              }}
            >
              Deshabilitar 2FA
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/auth/setup-2fa')}
              style={{
                height: 34,
                padding: '0 14px',
                background: 'var(--ps-cyan)',
                border: 'none',
                borderRadius: 8,
                color: 'var(--ps-bg-base)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Habilitar 2FA
            </button>
          )}
        </div>
      </section>

      {/* Disable 2FA modal */}
      <Disable2FAModal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDisable2FA}
        isPending={disableTwoFactor.isPending}
      />

    </div>
  )
}
