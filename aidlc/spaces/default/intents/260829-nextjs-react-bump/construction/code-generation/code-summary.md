# Code Summary — Next.js / React version bump (apps/web)

## Revisión de changelog (FR5)

**Next.js 16.1.0 → 16.3.3**: la 16.3.3 incluye fixes de seguridad para dos advisories críticos — RCE no autenticado en servidores hosteados en Windows, y RCE no autenticado en la Image Optimization API cuando se usan archivos AVIF. Ninguno de los dos aplica directamente a este deploy (Linux/Docker, sin evidencia de AVIF en el pipeline de imágenes), pero es motivo adicional para actualizar. Hallazgo de compatibilidad: desde 16.3, Next.js incluye `@types/node` en su "peer fingerprint" — podría afectar monorepos con pines de `@types/node` distintos entre paquetes; se verificó (`pnpm --filter web typecheck` en verde) que no genera conflicto en este repo. Sin otros breaking changes relevantes identificados para este código base entre 16.1.0 y 16.3.3.
Fuentes: [Next.js 16.3](https://nextjs.org/blog/next-16-3), [Release v16.3.3](https://github.com/vercel/next.js/releases/tag/v16.3.3).

**React 19.2.0 → 19.2.8**: sin breaking changes de API. Un cambio notable: el prefijo default de `useId()` cambió de `:r:` a `_r_` (para que los IDs sean válidos en selectores CSS/nombres XML) — rompería snapshots que hardcodean el patrón `:r0:`. Se verificó (`rg ':r[0-9]'` sobre `apps/web/src` y `apps/web/tests`) que este repo no tiene ningún snapshot con ese patrón — sin impacto. La línea 19.2.x también trae parches de seguridad para `react-server-dom-*` (DoS + exposición de código fuente) ya incluidos en 19.2.4+, por lo tanto cubiertos en 19.2.8.
Fuentes: [React 19.2](https://react.dev/blog/2025/10/01/react-19-2).

## Archivos modificados

| Archivo                                                  | Cambio                                                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/package.json`                                  | `next` `^16.1.0`→`^16.3.3`; `react`/`react-dom` `^19.2.0`→`^19.2.8`; `@types/react`/`@types/react-dom` `^19.0.0`→`^19.2.0`; `eslint-config-next` `^16.1.0`→`^16.3.3` |
| `pnpm-lock.yaml`                                         | Regenerado vía `pnpm install` (raíz del monorepo)                                                                                                                    |
| `apps/web/tests/unit/config/package-versions.test.ts`    | **Nuevo** — 4 tests de regresión de versión (patrón `*.config.test.ts` ya establecido)                                                                               |
| `apps/web/src/lib/api/fetchWithAuth.ts`                  | 1 línea `eslint-disable-next-line` con justificación (ver Deviaciones)                                                                                               |
| `apps/web/src/app/auth/login/LoginPageContent.tsx`       | 2 líneas `eslint-disable-next-line` con justificación                                                                                                                |
| `apps/web/src/app/auth/register/RegisterPageContent.tsx` | 2 líneas `eslint-disable-next-line` con justificación                                                                                                                |

## Decisiones clave

- **Companion packages en lockstep** (`@types/react`, `@types/react-dom`, `eslint-config-next`): decidido en Requirements Analysis (P1=A), evita drift de tipos/config respecto al Next.js/React reales instalados.
- **Rangos caret preservados** (`^16.3.3`, `^19.2.8`): decidido en Requirements Analysis (P3=A), consistente con el estilo de pineo ya usado por estos dos paquetes en el repo.
- **1 test nuevo, no más**: Test Strategy Minimal + decisión explícita del usuario (P2) de no agregar tests de comportamiento nuevos por ser un bump de dependencias, no funcionalidad nueva. El único test nuevo cubre el happy-path floor del "componente" que sí cambió: los pines de versión.

## Deviación: 5 warnings nuevos de lint suprimidos con justificación

Al correr `pnpm --filter web lint` tras el bump, `eslint-config-next@16.3.3` sacó 5 warnings NUEVOS de la regla `@next/next/no-location-assign-relative-destination`, en 3 archivos que este cambio no tocaba funcionalmente:

- `fetchWithAuth.ts:37` — `window.location.href = "/auth/login"` dentro de un módulo no-React; es un full-page reload deliberado (documentado en el propio docstring del archivo) al fallar el refresh de sesión, para resetear todo el estado del cliente.
- `LoginPageContent.tsx` (×2) y `RegisterPageContent.tsx` (×2) — `window.location.href = ${NEXT_PUBLIC_API_URL}/api/auth/oauth/{google,microsoft}/authorize`, redirects a un dominio EXTERNO (el backend), no a una página interna de Next.js; `router.push()` no puede cruzar de origen. El linter no puede resolver estáticamente que el template literal apunta a un origen absoluto, de ahí el falso positivo.

Presentado al usuario con el código completo de los 5 call sites (ver `memory.md`); decisión explícita del usuario: suprimir con `eslint-disable-next-line` puntual + comentario explicando el porqué en cada caso, sin reescribir el patrón de navegación (que tocaría código de auth fuera del alcance de este bump). El patrón de navegación en sí queda **fuera de este cambio** — si se decide revisarlo, amerita su propio intent (mismo criterio que `260828-zod-3-to-4-migration` y `260828-useeffect-to-react-query` en este proyecto: hallazgos reales pero no relacionados se registran aparte, no se cuelan en el cambio en curso).

## Cobertura de tests

- **Baseline (antes del bump)**: 156 test files, 1243 passed / 13 failed / 1256 total. Las 13 fallas son pre-existentes en `main` (mock sin `published_to_marketplace`, no relacionadas a este cambio — documentado en memoria del proyecto).
- **Después del bump**: 157 test files, 1247 passed / 13 failed / 1260 total. Las mismas 13 fallas pre-existentes, sin cambios. Las 4 tests nuevas (`package-versions.test.ts`) pasan.
- **0 regresiones nuevas** introducidas por el bump.
- `pnpm --filter web typecheck`: 0 errores.
- `pnpm --filter web lint`: 0 errores, 0 warnings (tras las supresiones justificadas).
- **`tests/e2e` (Playwright, NFR4) — PENDIENTE**: no se pudo correr en este sandbox por falta de infraestructura (sin `docker`, sin Postgres/backend/frontend escuchando en los puertos que `playwright.config.ts` necesita para su `webServer`). Decisión explícita del usuario: dejarlo documentado como paso manual pendiente antes de mergear, en vez de bloquear esta etapa. **Acción requerida antes de dar este cambio por completamente verificado**: correr `pnpm --filter e2e test` (o el comando equivalente) en un entorno con Docker/Postgres disponible.

## Reinstalación de dependencias

`pnpm install` corrido desde la raíz del monorepo. Versiones instaladas confirmadas: `next@16.3.3`, `react@19.2.8`, `react-dom@19.2.8`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`, `eslint-config-next@16.3.3` — todas resuelven dentro de los rangos caret nuevos.
