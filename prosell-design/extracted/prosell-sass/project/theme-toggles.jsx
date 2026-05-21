// ProSell — theme toggle component variants.
// Each component takes { mode, onChange } and renders an isolated toggle UI.
// "mode" is "dark" | "light" (variant E also supports "system").

const { useState } = React;

/* ============ Shared tiny SVG icons ============ */

const SunIcon = ({ size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = ({ size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = ({ size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

/* ============ A · Single icon swap (minimal) ============ */
/* 36px round ghost button. Crossfades sun→moon. */

function ToggleA({ mode, onChange }) {
  const dark = mode === 'dark';
  const isCyan = '#4DB8FF';
  return (
    <button
      type="button"
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => onChange(dark ? 'light' : 'dark')}
      style={{
        width: 36, height: 36, borderRadius: 10,
        background: dark ? 'rgba(13,27,62,0.6)' : '#FFFFFF',
        border: `1px solid ${dark ? 'rgba(77,184,255,0.15)' : '#D5DCEA'}`,
        color: dark ? '#F0F4FF' : '#0E1730',
        cursor: 'pointer',
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isCyan;
        e.currentTarget.style.color = isCyan;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = dark ? 'rgba(77,184,255,0.15)' : '#D5DCEA';
        e.currentTarget.style.color = dark ? '#F0F4FF' : '#0E1730';
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: dark ? 0 : 1,
        transform: `rotate(${dark ? -90 : 0}deg) scale(${dark ? 0.6 : 1})`,
        transition: 'all 260ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        <SunIcon size={17} />
      </span>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        opacity: dark ? 1 : 0,
        transform: `rotate(${dark ? 0 : 90}deg) scale(${dark ? 1 : 0.6})`,
        transition: 'all 260ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        <MoonIcon size={17} />
      </span>
    </button>
  );
}

/* ============ B · Sun/Moon segmented ============ */
/* Two icons side by side in a pill. Active = cyan circle. */

function ToggleB({ mode, onChange }) {
  const dark = mode === 'dark';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      height: 32, padding: 2,
      borderRadius: 100,
      background: dark ? 'rgba(13,27,62,0.6)' : '#EEF1F8',
      border: `1px solid ${dark ? 'rgba(77,184,255,0.10)' : '#E5EAF4'}`,
    }}>
      {[
        { id: 'light', icon: <SunIcon size={14} stroke={2.25} /> },
        { id: 'dark',  icon: <MoonIcon size={14} stroke={2.25} /> },
      ].map(o => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-label={o.id === 'light' ? 'Modo claro' : 'Modo oscuro'}
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: 0, padding: 0, cursor: 'pointer',
              background: active
                ? (o.id === 'dark' ? '#4DB8FF' : '#1E5FD4')
                : 'transparent',
              color: active ? '#060D24' : (dark ? '#8A9BBF' : '#4E5C7E'),
              boxShadow: active
                ? (o.id === 'dark'
                    ? '0 0 12px rgba(77,184,255,0.45)'
                    : '0 0 12px rgba(30,95,212,0.35)')
                : 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}

/* ============ C · Animated slider ============ */
/* Wide pill with sliding thumb that carries the active icon. */

function ToggleC({ mode, onChange }) {
  const dark = mode === 'dark';
  return (
    <button
      type="button"
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={dark}
      onClick={() => onChange(dark ? 'light' : 'dark')}
      style={{
        position: 'relative',
        width: 60, height: 30,
        borderRadius: 100,
        padding: 0,
        border: `1px solid ${dark ? 'rgba(77,184,255,0.20)' : '#D5DCEA'}`,
        background: dark
          ? 'linear-gradient(135deg, rgba(13,27,62,0.9), rgba(6,13,36,0.95))'
          : 'linear-gradient(135deg, #F4F6FB, #FFFFFF)',
        cursor: 'pointer',
        boxShadow: dark
          ? 'inset 0 2px 6px rgba(0,0,0,0.3)'
          : 'inset 0 2px 4px rgba(14,23,48,0.05)',
        transition: 'all 280ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* track icons */}
      <span style={{
        position: 'absolute', top: '50%', left: 8,
        transform: 'translateY(-50%)',
        color: dark ? 'rgba(138,155,191,0.4)' : '#A85508',
        opacity: dark ? 0.5 : 1,
        transition: 'all 280ms',
      }}>
        <SunIcon size={12} stroke={2.25} />
      </span>
      <span style={{
        position: 'absolute', top: '50%', right: 8,
        transform: 'translateY(-50%)',
        color: dark ? '#4DB8FF' : 'rgba(138,155,191,0.5)',
        opacity: dark ? 1 : 0.5,
        transition: 'all 280ms',
      }}>
        <MoonIcon size={12} stroke={2.25} />
      </span>
      {/* thumb */}
      <span style={{
        position: 'absolute', top: 2,
        left: dark ? 30 : 2,
        width: 24, height: 24,
        borderRadius: '50%',
        background: dark
          ? 'linear-gradient(135deg, #4DB8FF, #1E5FD4)'
          : 'linear-gradient(135deg, #FFFFFF, #EEF1F8)',
        boxShadow: dark
          ? '0 0 12px rgba(77,184,255,0.55), 0 2px 6px rgba(0,0,0,0.4)'
          : '0 2px 6px rgba(14,23,48,0.18), 0 1px 2px rgba(14,23,48,0.06)',
        transition: 'left 320ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms',
      }} />
    </button>
  );
}

/* ============ D · Tri-state segmented ============ */
/* Sistema · Claro · Oscuro — 3-option segmented. */

function ToggleD({ mode, onChange }) {
  // map "dark" / "light" props through, default "system"
  const dark = mode === 'dark';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch',
      height: 32, padding: 3,
      gap: 2,
      borderRadius: 9,
      background: dark ? 'rgba(13,27,62,0.6)' : '#EEF1F8',
      border: `1px solid ${dark ? 'rgba(77,184,255,0.10)' : '#E5EAF4'}`,
    }}>
      {[
        { id: 'system', label: 'Sistema', icon: <MonitorIcon size={13} stroke={2.25} /> },
        { id: 'light',  label: 'Claro',   icon: <SunIcon size={13} stroke={2.25} /> },
        { id: 'dark',   label: 'Oscuro',  icon: <MoonIcon size={13} stroke={2.25} /> },
      ].map(o => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-label={o.label}
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '0 10px',
              border: 0, borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.005em',
              background: active
                ? (dark ? '#1A2D5A' : '#FFFFFF')
                : 'transparent',
              color: active
                ? (dark ? '#F0F4FF' : '#0E1730')
                : (dark ? '#8A9BBF' : '#4E5C7E'),
              boxShadow: active
                ? (dark
                    ? '0 0 0 1px rgba(77,184,255,0.18)'
                    : '0 1px 3px rgba(14,23,48,0.08), 0 0 0 1px rgba(14,23,48,0.04)')
                : 'none',
              transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============ E · Iconic toggle (button + label) ============ */
/* Single rounded button "Oscuro" / "Claro" with icon and chevron */

function ToggleE({ mode, onChange }) {
  const dark = mode === 'dark';
  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      onClick={() => onChange(dark ? 'light' : 'dark')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        height: 32, padding: '0 12px',
        borderRadius: 8,
        background: dark ? 'rgba(13,27,62,0.6)' : '#FFFFFF',
        border: `1px solid ${dark ? 'rgba(77,184,255,0.15)' : '#D5DCEA'}`,
        color: dark ? '#F0F4FF' : '#0E1730',
        fontFamily: 'inherit',
        fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em',
        cursor: 'pointer',
        transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        color: dark ? '#4DB8FF' : '#1E5FD4',
      }}>
        {dark ? <MoonIcon size={14} stroke={2.25} /> : <SunIcon size={14} stroke={2.25} />}
      </span>
      {dark ? 'Oscuro' : 'Claro'}
      <span style={{ color: dark ? '#8A9BBF' : '#94A0BD', display: 'inline-flex' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </span>
    </button>
  );
}

window.ProSellThemeToggles = { ToggleA, ToggleB, ToggleC, ToggleD, ToggleE, SunIcon, MoonIcon };
