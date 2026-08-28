# Requirements — Fix invalid Tailwind spacing classes

## Intent Analysis

El objetivo es que las clases de utilidad de spacing de Tailwind (`h-9.5`, `px-4.5`, `h-8.5`) usadas en 7 archivos del frontend rendericen el tamaño visual que originalmente se pretendía, en vez de compilar a CSS vacío como sucede hoy. La causa es que esos pasos de spacing no existen en la escala default de Tailwind 3 (que va en medios pasos de `0` a `3.5`) ni están extendidos en `tailwind.config.ts`. El fix se resuelve **dentro de Tailwind 3.4.17** — no se migra el framework — extendiendo la escala de `spacing` del theme con los pasos faltantes, de forma que las clases ya escritas en el código queden válidas sin tocar el markup. Se corrige además el drift documental en `CLAUDE.md` que afirma incorrectamente que el proyecto usa Tailwind 4.0, señalado por reverse-engineering como la causa raíz probable de que alguien haya escrito estas clases asumiendo una escala de Tailwind 4.

## Functional Requirements

### FR1 — Extender la escala de spacing de Tailwind

**FR1**: El sistema shall declarar los pasos de spacing `4.5` (1.125rem / 18px), `8.5` (2.125rem / 34px) y `9.5` (2.375rem / 38px) en `theme.extend.spacing` de `apps/web/tailwind.config.ts`, de modo que las utilidades `h-9.5`, `px-4.5` y `h-8.5` compilen a CSS válido con exactamente esos valores.

- **FR1.1**: La extensión shall usarse `theme.extend.spacing` (aditivo), nunca sobrescribir `theme.spacing` — preserva toda la escala default de Tailwind 3 (los medios pasos `0.5`–`3.5` ya válidos y usados en el resto del proyecto).
- **FR1.2**: Los valores nuevos shall expresarse en `rem` (consistente con la convención de la escala default de Tailwind), no en `px`.

### FR2 — Corregir las clases inválidas en los 7 archivos afectados

**FR2**: El sistema shall verificar que, tras FR1, las siguientes clases ya escritas en el código compilan correctamente (no requieren cambio de markup si FR1 se implementa correctamente) — y shall corregirlas si algún caso puntual no calza con la extensión genérica de FR1:

- **FR2.1**: `apps/web/src/components/onboarding/OnboardingStep3.tsx` — `h-9.5` en líneas 167, 181, 196 (3 instancias)
- **FR2.2**: `apps/web/src/app/(seller)/publications/page.tsx` — `h-9.5` en líneas 286, 297, 443, 450 y `px-4.5` en líneas 286, 297 (6 instancias)
- **FR2.3**: `apps/web/src/components/publisher/PublishForm.tsx` — `h-9.5` en líneas 573, 583 (2 instancias)
- **FR2.4**: `apps/web/src/app/privacy/page.tsx` — `px-4.5` en línea 89 (1 instancia)
- **FR2.5**: `apps/web/src/app/terms/page.tsx` — `px-4.5` en línea 89 (1 instancia)
- **FR2.6**: `apps/web/src/components/appointments/AppointmentForm.tsx` — `px-4.5` en línea 529 (1 instancia)
- **FR2.7**: `apps/web/src/components/pipeline/KanbanBoard.tsx` — `h-8.5` en línea 291 (1 instancia)

Total: 7 archivos, 13 instancias.

### FR3 — Corregir drift documental en CLAUDE.md

**FR3**: El sistema shall corregir la tabla "Tech Stack 2026" en el `CLAUDE.md` raíz del proyecto, reemplazando la entrada `TailwindCSS | 4.0` por `TailwindCSS | 3.4.17` (versión real instalada según `apps/web/package.json`).

## Non-Functional Requirements

### NFR1 — Preservación del tamaño visual exacto

**NFR1**: El tamaño visual renderizado de cada elemento afectado (alto/padding en px) shall ser idéntico antes y después del fix — `h-9.5` debe seguir midiendo 38px, `px-4.5` 18px, `h-8.5` 34px. Verificable por inspección del CSS compilado (el valor `rem` declarado en FR1 debe corresponder exactamente al valor `.5`-step original).

### NFR2 — No regresión en la suite existente

**NFR2**: La suite de tests existente (frontend, `pnpm test` / vitest) shall permanecer en verde tras el cambio — consistente con la postura de testing por defecto del proyecto para scope `bugfix`/`express` (regresión dirigida, sin piso de cobertura nuevo).

## Constraints

- **C1**: No migrar ni actualizar la versión de Tailwind instalada (`3.4.17`) — restricción explícita del pedido original ("Do NOT migrate to TW4"), reafirmada tras la aclaración de Q1/follow-up.
- **C2**: El cambio en `tailwind.config.ts` debe ser aditivo (`theme.extend.spacing`), no reemplazar la escala default.

## Assumptions

- **A1**: Los valores `4.5`, `8.5` y `9.5` representan necesidades de spacing genuinas en medios pasos de `0.25rem`, consistentes con el resto del sistema de diseño que ya usa medios pasos (`0.5`–`3.5`) — extender la escala es coherente con el lenguaje de diseño existente, no una excepción puntual.
- **A2**: El sweep de todo el repo hecho en reverse-engineering (grep de clases `*-<n>.5` cruzado contra la escala default de Tailwind 3) cubrió el 100% de `apps/web/src` — no se asume la existencia de instancias adicionales no descubiertas, pero tampoco se re-verifica en esta etapa.

## Out of Scope

- **Migración de Tailwind 3 → 4**: queda como intent aparte, a decidir/registrar en el futuro (mismo patrón que la migración de Zod 3→4, intent `260828-zod-3-to-4-migration`).
- Otros puntos de drift documental en `CLAUDE.md` no relacionados con Tailwind (p. ej. `packages/shared-types/` documentado pero ausente en disco) — fuera de alcance de este intent.
- El defecto conocido de los proxies BFF (`response.json()` sin chequeo de `content-type`) — issue preexistente no relacionado, ya documentado en la memoria del proyecto.

## Open Questions

Ninguna — todas las ambigüedades se resolvieron en el flujo de preguntas (ver `requirements-analysis-questions.md`).
