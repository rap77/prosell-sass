'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'prosell-theme'

/**
 * ProSell theme toggle — dark (default) ↔ light.
 *
 * Reads/writes to localStorage and applies `data-theme="light"` on
 * <html>. The anti-flash script in layout.tsx ensures no flicker on
 * page load.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (saved === 'light') setTheme('light')
    } catch {}
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      const h = document.documentElement
      if (next === 'light') {
        // Light mode: remove dark class (Tailwind dark:* off) + set data-theme (CSS vars)
        h.classList.remove('dark')
        h.setAttribute('data-theme', 'light')
        localStorage.setItem(STORAGE_KEY, 'light')
      } else {
        // Dark mode: add dark class (Tailwind dark:* on) + remove data-theme (CSS vars use :root)
        h.classList.add('dark')
        h.removeAttribute('data-theme')
        localStorage.setItem(STORAGE_KEY, 'dark')
      }
    } catch {}
  }

  // Avoid hydration mismatch — render a placeholder until mounted
  if (!mounted) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'transparent',
        }}
      />
    )
  }

  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      title={isLight ? 'Modo oscuro' : 'Modo claro'}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '1px solid var(--ps-border-default)',
        background: 'transparent',
        color: 'var(--ps-text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ps-cyan)'
        e.currentTarget.style.background = 'var(--ps-hover-bg-sm)'
        e.currentTarget.style.color = 'var(--ps-cyan)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ps-border-default)'
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--ps-text-secondary)'
      }}
    >
      {isLight ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
    </button>
  )
}
