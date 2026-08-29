# Requirements — Next.js / React version bump (apps/web)

## Análisis de intención

El objetivo es actualizar `apps/web` a Next.js 16.3.3 (desde 16.1.0) y React/React DOM 19.2.8 (desde 19.2.0) — un bump de patch/minor dentro del mismo major en ambos casos, presentado por el usuario como bajo riesgo. Confirmado por revisión del código (`apps/web/package.json`, 2026-08-29): las versiones actuales son exactamente `next: ^16.1.0`, `react`/`react-dom`: `^19.2.0`. Ningún otro miembro del workspace (`apps/api`, `package.json` raíz, `tests/e2e`) depende de Next.js o React, así que el cambio queda contenido a `apps/web`.

El objetivo no es solo cambiar dos números de versión: incluye subir los paquetes acompañantes en lockstep (`@types/react`, `eslint-config-next`), documentar una revisión de breaking changes antes de tocar código, y verificar con la suite completa (unit + e2e) que nada se rompió.

## Functional Requirements

**FR1** — El sistema debe actualizar el pin de Next.js en `apps/web/package.json` de `^16.1.0` a `^16.3.3`.

**FR2** — El sistema debe actualizar los pines de `react` y `react-dom` en `apps/web/package.json` de `^19.2.0` a `^19.2.8`.

**FR3** — El sistema debe actualizar los paquetes acompañantes en el mismo cambio, en lockstep con Next.js/React:

- **FR3.1** — `@types/react` (actualmente `^19.0.0`) a la versión que corresponda a la línea React 19.2.x.
- **FR3.2** — `@types/react-dom`, si existe como dependencia explícita, a la versión correspondiente.
- **FR3.3** — `eslint-config-next` (actualmente `^16.1.0`) a la versión que corresponda a Next.js 16.3.x.

**FR4** — El sistema debe reinstalar dependencias (`pnpm install`) para regenerar `pnpm-lock.yaml` reflejando los nuevos rangos pineados.

**FR5** — Antes de modificar código de aplicación, debe documentarse una revisión explícita de las release notes/changelog de Next.js (16.1.0 → 16.3.3) y React (19.2.0 → 19.2.8), identificando cualquier breaking change o deprecación relevante para este código base. El resultado de esa revisión (hallazgos o "sin hallazgos relevantes") queda registrado como parte de este cambio.

## Non-Functional Requirements

**NFR1** — La suite existente de Vitest (unit + componentes) en `apps/web` debe seguir en verde al 100% después del bump — cero regresiones nuevas.

**NFR2** — `pnpm typecheck` en `apps/web` debe pasar sin errores de tipo nuevos.

**NFR3** — `pnpm lint` en `apps/web` debe pasar con `--max-warnings=0`, sin warnings nuevos introducidos por el bump.

**NFR4** — La suite E2E de Playwright en `tests/e2e` debe pasar contra la aplicación ya actualizada.

**NFR5** — El cambio debe quedar confinado a `apps/web`: no se modifica `apps/api`, el `package.json` raíz, ni la versión propia de Playwright/`@playwright/test` de `tests/e2e`.

## Constraints

- Scope `express` / Depth Minimal / Test Strategy Minimal: no se agregan tests nuevos más allá de mantener en verde la suite existente — no aplica el piso "1 test por requirement" porque no hay funcionalidad nueva que testear, solo verificación de no-regresión.
- Solo se toca `apps/web` — confirmado que `apps/api`, la raíz del monorepo y `tests/e2e` no dependen de `next`/`react`/`react-dom`.
- Se mantienen rangos caret (`^16.3.3`, `^19.2.8`), no se pasa a pines exactos — consistente con el estilo de pineo actual del repo para estos dos paquetes.

## Assumptions

- Se asume que `16.3.3` (Next.js) y `19.2.8` (React) son efectivamente las últimas versiones estables al momento de implementar — esto no fue verificado contra el registro de npm en esta etapa (Requirements Analysis no tiene acceso de red saliente confirmado); Code Generation debe reconfirmar que esas versiones existen y son estables antes de fijar el pin.
- Se asume que ningún otro paquete del workspace necesita un bump correspondiente — validado por inspección de `package.json` raíz y `tests/e2e/package.json`, ninguno referencia `next` ni `react`.
- Se asume que la mención informal de un agente previo ("Andá de a una, arrancá con la de Next/React primero") indica que este es el primero de varios bumps de dependencias planeados, pero que los demás quedan fuera de este intent y se abordarán como intents separados.

## Out of Scope

- `apps/api` (backend Python/FastAPI) — sin cambios.
- `package.json` raíz del monorepo — sin cambios.
- Versión propia de Playwright/`@playwright/test` en `tests/e2e/package.json` — sin cambios (distinta de la que usa `apps/web` como devDependency).
- Cualquier otro bump de dependencia insinuado para más adelante (Tailwind, Zod 3→4, u otros) — cada uno es o será un intent separado.
- Migración de Zod 3→4 (`260828-zod-3-to-4-migration`, ya registrada aparte) y migración `useEffect`→React Query (`260828-useeffect-to-react-query`) — no relacionadas con este bump, no se tocan aquí.

## Open Questions

Ninguna pendiente — las 4 preguntas de aclaración fueron resueltas y confirmadas por el usuario (ver `requirements-analysis-questions.md`).
