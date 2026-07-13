# Session: Landing Page — Redesign, Handoff Implementation & Component Refactor

**Date**: 2026-05-21
**Branch**: `main`
**Commits**: `b124452`, `a6ca3c5`, `[logo]`, `[sections]`, `[refactor]`
**Status**: ✅ Complete

---

## Objetivo

Continuar desde la sesión anterior: corregir errores TypeScript del redesign, commitear 70+ archivos pendientes, implementar la landing page pública basada en el handoff de diseño (`prosell-design/ProSell Sass-handoff.zip`).

---

## Trabajo realizado

### 1. Fix de 6 errores TypeScript del redesign

**Archivos**: `src/components/icons/index.tsx`, `src/components/leads/DuplicateWarning.tsx`

**Problema**:

- `ShieldIcon` (y el resto de íconos custom) recibían `style` prop desde `TwoFactorSetupForm.tsx`, pero `IconProps` no declaraba `style?: CSSProperties`.
- `DuplicateWarning` era llamado con `className="max-w-full"` desde `vendedor/leads/[id]/page.tsx:185`, pero la interface no declaraba `className`.

**Fix**:

```ts
// icons/index.tsx
import type { CSSProperties } from "react";

export interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties; // ← agregado
}

// DuplicateWarning.tsx
interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
  onLeadClick?: (leadId: string) => void;
  style?: React.CSSProperties;
  className?: string; // ← agregado
}
```

`pnpm typecheck`: 0 errores post-fix.

---

### 2. Commit del redesign frontend completo

- **Commit**: `feat(web): apply ProSell dark premium design system across entire frontend`
- **157 archivos**: 70+ componentes rediseñados + 4 archivos nuevos + `prosell-design/` (83 archivos del handoff extraído)
- **Design system**: tokens `--ps-*` en `globals.css`, dark mode por defecto, paleta: base `#060D24`, cyan `#4DB8FF`, navy/blue family

---

### 3. Landing page — implementación completa desde handoff

**Archivo principal**: `src/app/page.tsx` (luego refactorizado a componentes)

**Secciones implementadas** (en orden de la página):

| Sección                | Descripción                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Nav                    | Sticky, blur backdrop, logo real, links, CTAs                                                     |
| Hero                   | Dos columnas: copy + dashboard mockup animado (float), floating badges                            |
| Proof strip            | "2.400 equipos" + 5 company names                                                                 |
| Problema → Solución    | Pain chips en rojo (43%, 65-80%, +8hs) → divider → 3 solution cards → niche switcher              |
| Features (alternating) | 3 filas: Distribución (channel grid mockup) / Leads (inbox + AI) / Inteligencia (bar chart + ROI) |
| Métricas               | 4 stats grandes: 43% / <60s / 3.2x / $15K + blockquote                                            |
| Precios                | Toggle Mensual/Por comisión, 3 planes (Arranque $0 / Crecimiento $299 featured / Enterprise)      |
| Cómo funciona          | 3 pasos numerados con íconos y time tags                                                          |
| Testimonios            | Grid 3+2 con avatar stack, role, niche badge                                                      |
| FAQ                    | Layout 2 columnas, accordion nativo `<details>`                                                   |
| Final CTA              | Gradient bg, pulse dot, "Tu próximo cierre empieza acá.", trust badges                            |
| Footer                 | 4 columnas: brand+social / Producto / Empresa / Soporte + footer-bar                              |

---

### 4. Logo — consistencia en toda la app

**Problema**: El logo era un `<div>` con "P" en gradient. El handoff tiene `assets/logo-mark.png` — una "P" pintada con nodos de circuito (271×294px).

**Archivos actualizados**:

- `apps/web/public/logo-mark.png` ← copiado desde `prosell-design/extracted/...`
- `src/app/page.tsx` — landing (nav + footer)
- `src/components/auth/AuthShell.tsx` — panel izquierdo de todas las páginas auth
- `src/components/layout/Sidebar.tsx` — header del sidebar en toda la app
- `src/app/auth/setup-2fa/Setup2FAPageContent.tsx` — página standalone de 2FA

**Implementación**:

```tsx
<Image
  src="/logo-mark.png"
  alt="ProSell"
  width={271} // dimensiones naturales del PNG
  height={294}
  style={{ height: 34, width: "auto", flexShrink: 0 }}
/>
```

`width` y `height` naturales → CSS override con `height: 34px, width: auto` para mantener aspect ratio sin warnings.

---

### 5. Refactor: cada sección = componente individual

**Motivación**: Facilitar edición, ocultado y trabajo individual sobre secciones.

**Estructura creada**: `src/components/landing/`

```
_data.ts                  ← pricing plans, testimonios, FAQ items
landing-styles.tsx         ← keyframes + CSS classes hover/interactive
landing-nav.tsx
landing-hero.tsx
landing-proof-strip.tsx
landing-problem-solution.tsx
landing-features.tsx
landing-metrics.tsx
landing-pricing.tsx
landing-how-it-works.tsx
landing-testimonials.tsx
landing-faq.tsx
landing-final-cta.tsx
landing-footer.tsx
```

**`page.tsx` resultante** (55 líneas):

```tsx
export default function HomePage() {
  return (
    <>
      <LandingStyles />
      <div style={{ ... }}>
        {/* background glows */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <LandingNav />
          <main>
            <LandingHero />
            <LandingProofStrip />
            <LandingProblemSolution />
            <LandingFeatures />
            <LandingMetrics />
            <LandingPricing />
            <LandingHowItWorks />
            <LandingTestimonials />
            <LandingFaq />
            <LandingFinalCta />
          </main>
          <LandingFooter />
        </div>
      </div>
    </>
  );
}
```

Para ocultar una sección: comentar una línea. Para editar: abrir el componente individual.

---

### 6. Footer — fix desde handoff real

**Antes**: Single-row con logo + copyright + Privacidad/Términos.

**Después** (fiel al handoff):

```
┌─────────────────────────────────────────────┐
│ Logo ProSell                                 │
│ La infraestructura de ventas para equipos... │
│ [LinkedIn] [X] [Instagram]                   │
│                                              │
│  Producto    Empresa      Soporte            │
│  Funciones   Sobre nos.   Docs               │
│  Precios     Blog         Centro ayuda       │
│  Integrac.   Prensa       Status sistema     │
│  Changelog   Careers      Términos           │
│  Roadmap     Contacto     Privacidad         │
│                                              │
│──────────────────────────────────────────── │
│ © 2026 ProSell. Todos los derechos.  Térm.·Priv. │
└─────────────────────────────────────────────┘
```

**Background**: `rgb(4, 10, 26)` (más oscuro que el base `#060D24`).

---

## Patrones técnicos relevantes

### CSS en Server Components

Animaciones CSS (`@keyframes`) se manejan con un `<style>` tag embebido en `LandingStyles` — patrón ya usado en `TwoFactorSetupSkeleton`. Evita JavaScript en el cliente para animaciones puramente decorativas.

### `<details>` nativo para FAQ

La sección FAQ usa `<details>` + `<summary>` HTML nativos — funcionalidad accordion sin JS, compatible con Server Components. El primer ítem se renderiza `open` desde el servidor.

### Inline styles + CSS classes

- Tokens de color: `var(--ps-*)` en `style={{}}` inline
- Hover states, transitions y keyframes: clases CSS en `LandingStyles`
- Esta división evita que Tailwind pelee con los tokens custom del design system

### Handoff consultado

`prosell-design/extracted/prosell-sass/project/`:

- `README.md` — fundamentals del design system
- `SKILL.md` — reglas at-a-glance
- `marketing/Hero.standalone-src.html` — hero section (leído directamente)
- `ProSell Landing.html` — página completa (abierta via HTTP server local para inspección visual + JS extraction)

---

## Archivos clave modificados/creados

| Archivo                                          | Cambio                                 |
| ------------------------------------------------ | -------------------------------------- |
| `src/app/page.tsx`                               | Orquestador delgado (55 líneas)        |
| `src/components/landing/*.tsx`                   | 13 componentes nuevos + `_data.ts`     |
| `src/components/auth/AuthShell.tsx`              | Logo mark real                         |
| `src/components/layout/Sidebar.tsx`              | Logo mark real                         |
| `src/app/auth/setup-2fa/Setup2FAPageContent.tsx` | Logo mark real                         |
| `src/components/icons/index.tsx`                 | `style?: CSSProperties` en `IconProps` |
| `src/components/leads/DuplicateWarning.tsx`      | `className?: string` en props          |
| `apps/web/public/logo-mark.png`                  | Asset del handoff                      |

---

## Estado al cierre

- **TypeScript**: `pnpm typecheck` — 0 errores ✅
- **Landing**: todas las secciones del handoff implementadas ✅
- **Logo**: consistente en toda la app ✅
- **Arquitectura**: cada sección es un componente independiente ✅
- **Siguiente paso sugerido**: conectar los links del nav con anchors reales (`#precios`, `#funciones`, etc.)
