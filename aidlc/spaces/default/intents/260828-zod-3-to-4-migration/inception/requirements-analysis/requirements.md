# Requirements — Migración Zod 3 → Zod 4 (sintaxis nativa)

## Intent analysis

El objetivo no es instalar Zod 4 (`apps/web/package.json` ya tiene `zod: ^4.4.0` desde el commit `d1af1858`/`6042236b`, 2026-07-20) sino terminar de migrar el **código** que todavía está escrito en idioma Zod 3: 36 call sites de `.passthrough()` en 14 archivos y 4 de `z.nativeEnum()` en 2 archivos. La premisa original del intent — "terminar la migración bloqueada por el issue #74" — quedó corregida durante Reverse Engineering: el issue #74 está **cerrado** desde 2026-07-20 y su alcance propio (verificado vía `gh issue view 74`) nunca incluyó estos dos patrones, solo el patrón de mensaje de error (`.min(n, "msg")` → `{ error: ... }`), ya migrado al 100%. Esta limpieza es alcance genuinamente nuevo, no la finalización de un trabajo abandonado — y el bloqueo real (GGA citando la excepción Zod 3 de `AGENTS.md`) es lo que impidió que avanzara antes.

Meta real: dejar `apps/web` escrito consistentemente en sintaxis Zod 4 nativa (`z.looseObject()`, `z.enum()` sobre TS enums), corregir la documentación de `AGENTS.md` para que refleje la realidad, y no dejar que GGA vuelva a bloquear el cambio por la misma razón.

## Functional requirements

### FR1 — Migrar `.passthrough()` a `z.looseObject()`

Migrar los 36 call sites de `.passthrough()` en los 14 archivos identificados a `z.looseObject({...})`, preservando el comportamiento de tolerar campos del backend que la UI todavía no renderiza.

- **FR1.1** — Archivos bajo `apps/web/src/lib/api/schemas/` (11 de los 14): `orgApi.ts`, `category.ts`, `vendedores.ts`, `organizations.ts`, `productImageUrls.ts`, `leads.ts`, `walletApi.ts`, `authRoutes.ts`, `appointments.ts`, `authApi.ts`, `teamApi.ts`.
- **FR1.2** — Los 3 archivos outlier fuera de `schemas/`: `apps/web/src/lib/api/verticals.ts`, `apps/web/src/lib/api/extractErrorMessage.ts` (el intento parcial ya revertido por GGA). `apps/web/src/lib/api/products.ts` no tiene `.passthrough()` propio en el conteo verificado, pero su ubicación fuera de `schemas/` queda documentada como la misma inconsistencia de organización (no funcional, no requiere cambio de código en este FR).
- **FR1.3** — Reescribir los 8 comentarios de cabecera que mencionan `.passthrough()` en prosa (en los mismos 8 archivos de `schemas/` listados en FR1.1 que lo mencionan) para que reflejen `z.looseObject()`.
- **FR1.4** — Caso especial `UnifiedProductForm.tsx`: `FIXED_FIELDS_SCHEMA` (definida en la línea 99, usada en modo estricto vía `.merge(attrSchema)` en la línea 290) mantiene su definición estricta sin cambios. Introducir una segunda variante derivada en modo loose (p. ej. `FIXED_FIELDS_SCHEMA_LOOSE`) específicamente para reemplazar el `.passthrough()` de uso en la línea 483 (`FIXED_FIELDS_SCHEMA.passthrough().parse(data)`), sin alterar el comportamiento de la línea 290.

### FR2 — Migrar `z.nativeEnum()` a `z.enum()` sobre TS enum

Migrar los 4 call sites de `z.nativeEnum()` en los 2 archivos identificados a `z.enum(EnumObject)` (forma soportada nativamente por Zod 4 sobre un objeto TS `enum`), preservando la colocación del enum en el mismo archivo del esquema que lo valida (patrón deliberado para evitar import circular, documentado in-line).

- **FR2.1** — `apps/web/src/lib/api/schemas/leads.ts`: 3 call sites (líneas 51, 69, 70) que envuelven `export enum LeadStatus` (declarado en la línea 17 del mismo archivo).
- **FR2.2** — `apps/web/src/lib/api/schemas/appointments.ts`: 1 call site (línea 31) que envuelve `export enum AppointmentStatus` (declarado en la línea 17 del mismo archivo).

### FR3 — Eliminar el bloque de excepción Zod 3 de `AGENTS.md`

Eliminar por completo el bloque `### Zod 3 Syntax (until issue #74 is resolved)` (líneas 124-139 de `AGENTS.md`), incluyendo su instrucción de cierre a GGA ("PASS any code using Zod 3 validator syntax. DO NOT flag as 'Zod 4 Rule' violation.") — la causa mecánica confirmada del bloqueo GGA sobre el intento de migración parcial anterior. No queda ninguna excepción Zod 3 vigente tras FR1/FR2: GGA vuelve a aplicar las reglas Zod 4 estándar sin excepción para este idioma.

### FR4 — Eliminar el shim muerto `zod-resolver.ts`

Eliminar `apps/web/src/lib/zod-resolver.ts` (shim custom de `zodResolver` creado en la migración original de #74, commit `d1af1858`, nunca importado en ningún punto del código — los 15 call sites reales importan `zodResolver` directo de `@hookform/resolvers/zod`).

### FR5 — Migrar el residuo de sintaxis Zod 3 en `profile/page.tsx`

Migrar `apps/web/src/app/(seller)/settings/profile/page.tsx:28` de `.string().email({ message: "Correo inválido" })` (forma encadenada + clave `message`, Zod 3) a `z.email({ error: "Correo inválido" })` (forma top-level + clave `error`, Zod 4) — mismo patrón ya aplicado en el resto del código migrado por el issue #74.

## Non-functional requirements

### NFR1 — Cero regresión de comportamiento

La migración es puramente de sintaxis de validación; no debe cambiar ningún comportamiento observable (validación exitosa/fallida sobre los mismos inputs, forma de los objetos parseados). La suite de tests existente (Vitest) debe seguir en verde después del cambio — consistente con la postura de testing del equipo para scope `refactor` (sin piso de test nuevo, suite existente en verde).

### NFR2 — El pipeline de pre-commit (GGA) no debe bloquear la migración

Tras aplicar FR3, verificar empíricamente (dry-run de pre-commit / GGA sobre los archivos migrados) que el bloqueo que afectó al intento parcial anterior (`extractErrorMessage.ts`, `appointments.ts`) ya no ocurre. Esto es una condición de aceptación operacional, no solo documental.

## Constraints

- Scope activo: `refactor` (Depth Minimal, Test Strategy Minimal) — sin piso de cobertura nuevo; alcanza con mantener la suite existente en verde.
- Zod ya está en `^4.4.0` en `apps/web/package.json` — no se requiere ningún cambio de versión de dependencia.
- Convenciones del proyecto: Conventional Commits, nunca `git commit --no-verify`, pipeline de pre-commit completo (GGA → secret scan → spec-status → validate-tailwind → lint-staged → ruff/ruff-format → pyright → react-doctor → hooks estándar) debe pasar antes de llegar a `main`.
- El backend (`apps/api`) queda fuera de alcance — usa Pydantic, no Zod; no aplica esta migración.

## Assumptions

- Los 8 comentarios de cabecera en prosa que mencionan `.passthrough()` (FR1.3) se actualizan como parte natural de FR1, no como un FR separado — son texto descriptivo del mismo cambio de sintaxis, sin implicación de diseño propia.
- Ningún test unitario asume explícitamente la presencia literal de `.passthrough()`/`z.nativeEnum()` en el código fuente (por ejemplo, vía snapshot de código o introspección de schema) — se asume que los tests existentes validan comportamiento de parseo, no sintaxis de definición. A confirmar en Code Generation si algún test resulta ser una excepción.
- La eliminación completa del bloque de `AGENTS.md` (FR3) es suficiente para desbloquear GGA sin necesidad de tocar otra configuración (`.gga`, reglas del provider `codex`) — ver NFR2 para la verificación empírica pendiente.

## Out of scope

- Cualquier trabajo de los otros seis intents ya registrados por separado (bug de `teamApi.create`/`org_id` vs `organization_id`, migración `useEffect`→React Query de onboarding/invite, clases Tailwind inválidas, deuda de tests de `products.test.tsx`/`reverseTransitions.test.tsx`, seed data de CI, fixes de CI round 2).
- Backend (`apps/api`) — no usa Zod.
- Cualquier cambio de comportamiento de negocio — esta migración es puramente de sintaxis de validación de datos.
- Agregar un test de nivel "Layer 3" (schema-matching DTO↔TypeScript) para el dominio Zod — mencionado como mejora futura en `code-quality-assessment.md`, no pedido por este intent.

## Open questions

- **NFR2 pendiente de verificación empírica**: confirmar en Code Generation, corriendo el pipeline de pre-commit real sobre los archivos migrados, que la eliminación del bloque de `AGENTS.md` (FR3) efectivamente desbloquea GGA — el developer no pudo probar esto en Reverse Engineering (solo lectura estática de reglas).
- **Excepción de test no descubierta**: si Code Generation encuentra algún test que dependa de la sintaxis literal `.passthrough()`/`z.nativeEnum()` (contrario a la asunción de Assumptions arriba), documentar y resolver puntualmente sin expandir el alcance de este FR set.

## Review

READY

### Findings

| #   | Severity | Location              | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Recommendation                                                                                                                                                                                                             |
| --- | -------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Major    | FR1.3                 | Dice "los 8 comentarios de cabecera... en los mismos 8 archivos de `schemas/` listados en FR1.1 que lo mencionan", pero FR1.1 lista 11 archivos y no identifica cuáles 3 de esos 11 quedan excluidos. `code-structure.md:141` y `architecture.md:492` (la única fuente upstream disponible) dicen "cada archivo abre con un comentario de cabecera" para exactamente esos mismos 11 nombres — es decir, la fuente consumida sugiere 11, no 8, y el artefacto no cita de dónde sale el recorte a 8. Un desarrollador no puede saber, solo con este requirement, en cuáles 3 archivos NO debe tocar el comentario. No es testeable/verificable tal como está redactado. | Nombrar explícitamente los 8 archivos (o los 3 excluidos) en FR1.3, o corregir el número si en realidad son 11.                                                                                                            |
| 2   | Minor    | FR1.2                 | La frase "`products.ts` no tiene `.passthrough()` propio en el conteo verificado" es una afirmación específica no verificable contra ninguno de los tres documentos de codekb consumidos (que solo confirman que `products.ts` es un outlier de ubicación, sin confirmar ausencia de `.passthrough()`). No bloquea la implementación porque el FR ya aclara "no requiere cambio de código", pero vale una nota de que el dato no tiene cita upstream explícita.                                                                                                                                                                                                       | Si el dato viene de una verificación adicional del developer en Reverse Engineering (no visible en los tres documentos citados), agregar la referencia; si no, marcarlo como pendiente de confirmación en Code Generation. |
| 3   | Minor    | NFR2 / Open questions | Correctamente framed como pendiente de verificación empírica (no se asume ya resuelto) — mencionado aquí solo para dejar constancia de que este punto SÍ cumple el criterio pedido, no como hallazgo negativo.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Ninguna — mantener como está.                                                                                                                                                                                              |

### Summary

Las FR trazan limpiamente a las tres respuestas de Q&A (Q1→FR3, Q2→FR1.4, Q3→FR4+FR5) y los conteos de `.passthrough()`/`z.nativeEnum()` (36/14, 4/2) coinciden exactamente con `architecture.md`. El único hallazgo bloqueante-si-no-se-corrige es FR1.3: identifica un subconjunto de 8 archivos sobre un universo de 11 sin nombrarlos, lo cual un desarrollador o QA no puede verificar de forma determinística. Con un solo Major y ningún Critical, el artefacto queda READY, pero se recomienda resolver el hallazgo #1 antes de Code Generation para evitar una decisión de alcance improvisada en esa etapa.
