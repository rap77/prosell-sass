# Bolt Plan

Un **Bolt** es una unidad desplegable de trabajo dentro de Construction — una pasada completa por
las etapas 3.1–3.7 para uno o más Units of Work. Este intent tiene un único Unit (`U1`), así que el
plan colapsa a un único Bolt.

## Bolt 1 — `u1-auth-navigation-refactor`

- **Unit(s) incluidos**: U1 (`u1-auth-navigation-refactor`)
- **Walking skeleton**: No — Practices Discovery afirmó explícitamente que el equipo no corre esa
  ceremonia (una porción mínima end-to-end construida primero para probar que las piezas
  conectan); no aplica de todos modos a un Bolt único que ya es todo el alcance.
- **Definition of Done**:
  - Helper de redirect OAuth consolidado y en uso desde `LoginPageContent.tsx` y
    `RegisterPageContent.tsx` (FR1).
  - Cero supresores `eslint-disable @next/next/no-location-assign-relative-destination` en el área
    tocada, o el mínimo justificado si la regla resulta genuinamente ineludible preservando la
    navegación completa del navegador (FR2, ver Open Question OQ1 de `requirements.md`).
  - `useOAuthPreload.ts` y su test asociado eliminados (FR3).
  - JSDoc de cabecera de `proxy.ts` corregido (FR4).
  - Tests nuevos para el `onClick` de los botones OAuth (Google y Microsoft) pasando (FR5).
  - Suite de tests existente (frontend) en verde, sin regresiones (NFR1).
  - Sin nuevas violaciones de lint/typecheck introducidas por el cambio.
- **Confidence hypothesis**: el flujo de login/register vía OAuth (Google y Microsoft) sigue
  funcionando exactamente igual para el usuario final tras el refactor — cero regresión de
  comportamiento observable (NFR3) — y el área ya no necesita justificar supresores de ESLint (o
  los justifica de forma mínima y documentada si la regla resulta ineludible).
- **Expected demo**: correr login y register con OAuth (ambos providers) en dev, confirmar que el
  redirect, la sesión y la resolución de rol no cambiaron visualmente; mostrar el diff del conteo
  de `eslint-disable` (5 → objetivo) y la corrida en verde de los tests nuevos + la suite existente.
