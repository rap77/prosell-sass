# Requirements Analysis — Clarifying Questions

Intent: `260902-teamapi-create-param` — Fix teamApi.create mismatch parameter (organization_id vs org_id)
Depth: Minimal (scope: bugfix)

Reverse Engineering ya identificó la causa raíz completa y el mecanismo exacto por el que el bug nunca se manifestó (mock BFF que intercepta la petición). Las preguntas de abajo se limitan a decisiones de alcance que el scan dejó explícitamente abiertas — no hay ambigüedad técnica pendiente.

## Q1: Alcance del fix de nombre de campo — ¿solo request, o request + response?

El mismatch existe simétricamente en dos superficies del contrato `team`:

- **Request** (nombrado en la descripción original del intent): frontend envía `organization_id`, backend espera `org_id` (`CreateTeamRequest`).
- **Response** (encontrado durante el scan, no nombrado en la descripción original): backend devuelve `org_id` (`TeamResponse`), frontend espera `organization_id` (`TeamSchema`, Zod, campo requerido sin `.optional()`).

Arreglar solo el lado de request dejaría el mismatch de response latente y sin cobertura — se manifestaría como `ZodError` en cuanto el request llegue al backend real.

- A. Arreglar ambos lados (request y response) en este mismo intent
- B. Arreglar solo el lado de request (el nombrado en la descripción original); dejar el de response para un intent separado
- X. Other (please specify)

[Answer]: A. Arreglar ambos lados (request y response) en este mismo intent

## Q2: La ruta BFF mock — ¿se corrige/remueve en este intent, o queda fuera de alcance?

`apps/web/src/app/api/v1/teams/route.ts` es un archivo de ruta mock que intercepta `POST /api/v1/teams` (y las dos lecturas GET relacionadas) antes de llegar al rewrite `fallback` hacia el backend real. Mientras ese mock exista, **arreglar solo el nombre del campo no tiene ningún efecto observable** — la petición nunca sale del proceso de Next.js hoy. Sin tocar el mock, el fix quedaría sin poder verificarse contra el backend real salvo con un test que hable directo con `team_router.py`.

- A. Remover/desactivar el mock de `POST/GET /api/v1/teams` en este intent, para que el flujo real quede ejercitado end-to-end
- B. Dejar el mock como está (fuera de alcance); el fix se verifica con un test que ejercite el contrato real sin pasar por el mock (p. ej. un test de integración directo contra `team_router.py`, o un test de schema-matching Zod↔Pydantic)
- X. Other (please specify)

[Answer]: A. Remover/desactivar el mock de `POST/GET /api/v1/teams` en este intent, para que el flujo real quede ejercitado end-to-end

## Q3: `teamApi.update()` — defecto relacionado (probable 405), ¿en este intent o aparte?

El mock de `[id]/route.ts` solo exporta `GET`, no `PATCH` — si `teamApi.update()` se ejercitara contra el mock hoy, probablemente devuelve 405. No es el mismatch de `organization_id`/`org_id` nombrado en la descripción original; es un defecto relacionado pero distinto, encontrado durante el scan.

- A. Incluir el fix de `teamApi.update()` (agregar `PATCH` al mock, o la corrección que corresponda) en este intent
- B. Dejarlo fuera de alcance — registrar como deuda conocida para un intent separado
- X. Other (please specify)

[Answer]: A. Incluir el fix de `teamApi.update()` (agregar `PATCH` al mock, o la corrección que corresponda) en este intent

## Q4: Test de contrato Layer 3 (schema-matching DTO↔TypeScript) para `team`

El proyecto ya tiene un patrón documentado (`.skills/contract-testing/SKILL.md`, "Layer 3: Schema Matching") diseñado exactamente para esta clase de bug, pero no existe una instancia de ese test para el dominio `team` — por eso `test_team_dto_schemas.py` (que sí existe) no detectó el mismatch: valida Pydantic contra sí mismo, nunca lee `teamApi.ts`.

- A. Agregar un test de Layer 3 (schema-matching) para `team` en este intent, como regresión que prueba el fix y previene que el bug reaparezca
- B. Cubrir el fix con tests más acotados (unit/contract existentes ampliados) sin introducir la infraestructura de Layer 3 en este intent
- X. Other (please specify)

[Answer]: A. Agregar un test de Layer 3 (schema-matching) para `team` en este intent, como regresión que prueba el fix y previene que el bug reaparezca

## Consolidated Summary Confirmation

- Se arregla el mismatch `organization_id`/`org_id` en AMBOS lados del contrato `team`: request (`teamApi.ts` → `CreateTeamRequest.org_id`) y response (`TeamResponse.org_id` → `TeamSchema.organization_id`).
- Se remueve/desactiva la ruta BFF mock in-memory (`apps/web/src/app/api/v1/teams/route.ts` y los mocks GET relacionados en `[id]/route.ts` y `org/[orgId]/route.ts`), para que el flujo `POST/GET /api/v1/teams` llegue realmente al backend FastAPI vía el rewrite `fallback` ya configurado.
- Se incluye el fix de `teamApi.update()` (agregar `PATCH` donde falte) como parte de este mismo intent.
- Se agrega un test de Layer 3 (schema-matching DTO↔TypeScript) para el dominio `team`, siguiendo el patrón ya documentado en `.skills/contract-testing/SKILL.md`, como regresión permanente contra este tipo de mismatch.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
