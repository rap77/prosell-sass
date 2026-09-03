# Requirements — Fix teamApi.create mismatch parameter (organization_id vs org_id)

Intent: `260902-teamapi-create-param` · Scope: bugfix · Depth: Minimal

## Intent Analysis

El objetivo real no es solo renombrar un campo — es cerrar un mismatch de contrato de wire entre el frontend y el backend en el dominio `team`, que hoy es completamente invisible en desarrollo/staging/producción porque una ruta BFF mock de Next.js (`apps/web/src/app/api/v1/teams/route.ts`) intercepta el tráfico antes de que llegue al backend real. El usuario decidió (Requirements Analysis Q1-Q4) tratar esto como una corrección de contrato completa: ambos lados del mismatch (request y response), remover el mock que lo enmascara, corregir un defecto relacionado (`teamApi.update()`), y agregar una regresión estructural (test Layer 3) para que esta clase de bug no vuelva a pasar desapercibida. La meta de negocio subyacente es que la creación de equipos dentro de una organización (`team_router.py` § "Onboarding e invitaciones", ver `business-overview.md`) funcione end-to-end contra el backend real, no solo contra un mock auto-consistente.

## Functional Requirements

### FR1 — Corregir el nombre de campo en el request de creación de equipo

**FR1.1**: El frontend (`apps/web/src/lib/api/teamApi.ts:40`, método `create()`) debe enviar el campo como `org_id` en vez de `organization_id`, para coincidir con `CreateTeamRequest.org_id` (`apps/api/src/prosell/application/dto/team/create.py:12`).

**FR1.2**: El call site que construye el payload (`apps/web/src/components/forms/TeamForm.tsx:149-152`, `onSubmit`) debe pasar `org_id` en vez de `organization_id`. `teamStore.ts:158-162` (`createTeam`) pasa el payload sin transformación — no requiere cambio propio si `TeamForm.tsx` y `teamApi.ts` ya están alineados, pero debe verificarse que ningún otro caller de `teamStore.createTeam` siga usando el nombre viejo.

### FR2 — Corregir el nombre de campo en el response de equipo

**FR2.1**: El schema Zod del frontend (`apps/web/src/lib/api/schemas/teamApi.ts:31`, `TeamSchema.organization_id`) debe leer `org_id`, para coincidir con `TeamResponse.org_id` (`apps/api/src/prosell/application/dto/team/response.py:44`).

**FR2.2**: Todo código que consuma el campo `organization_id` de un objeto `Team` parseado por `TeamSchema` (frontend) debe actualizarse a `org_id` en el mismo cambio, para que el rename no rompa consumidores silenciosamente.

### FR3 — Remover la ruta BFF mock que enmascara el bug

**FR3.1**: `apps/web/src/app/api/v1/teams/route.ts` (mock in-memory de `POST`/`GET /api/v1/teams`, `global.__mockTeams`) debe eliminarse o desactivarse, de forma que el rewrite `fallback` declarado en `apps/web/next.config.ts:82-102` pase a resolver estas rutas contra el backend FastAPI real (`team_router.py`).

**FR3.2**: `apps/web/src/app/api/v1/teams/[id]/route.ts` y `apps/web/src/app/api/v1/teams/org/[orgId]/route.ts` (mocks de las dos lecturas GET relacionadas) deben eliminarse o desactivarse por la misma razón — dejar cualquiera de los tres vivo perpetuaría el shadowing para esa ruta específica.

**FR3.3**: Tras remover los mocks, el flujo de creación de equipo debe verificarse contra el backend real (no solo contra tests unitarios que mockean `fetch`), confirmando que `POST /api/v1/teams` con el payload corregido (FR1) recibe una respuesta 2xx real y que esa respuesta se parsea correctamente con el schema corregido (FR2).

### FR4 — Corregir `teamApi.update()` (defecto relacionado)

**FR4.1**: `apps/web/src/app/api/v1/teams/[id]/route.ts` debe exponer también `PATCH`, o el mock debe removerse por completo per FR3.2 dejando que `PATCH /api/v1/teams/{id}` llegue al endpoint real (`team_router.py`, `PATCH "/{team_id}"`) — cualquiera de las dos vías satisface este requisito, dado que FR3.2 ya remueve el archivo de ruta completo.

### FR5 — Agregar test de Layer 3 (schema-matching) para `team`

**FR5.1**: Debe existir un test de "Schema Matching (DTO ↔ TypeScript Drift Detection)" para el dominio `team`, siguiendo el patrón ya documentado en `.skills/contract-testing/SKILL.md`, que falle si los nombres de campo de `CreateTeamRequest`/`TeamResponse` (backend, Pydantic) divergen de `teamApi.ts`/`schemas/teamApi.ts` (frontend, Zod/TypeScript).

**FR5.2**: Este test debe ser una regresión permanente — corre en la suite normal (no un script manual), de forma que un futuro rename en cualquiera de los dos lados sin actualizar el otro falle la suite antes de llegar a `main`.

## Non-Functional Requirements

**NFR1 — Regresión cero**: La suite de tests existente (frontend Vitest + backend pytest) debe seguir en verde después del cambio, salvo los tests que se actualicen deliberadamente como parte de este fix (p. ej. `useTeams.test.ts`, que hoy mockea la acción del store sin asertar nombres de campo de wire, y cualquier test que dependiera del comportamiento del mock BFF removido).

**NFR2 — Sin cambio de comportamiento de negocio**: Este es un fix de contrato de wire — no debe alterar ninguna regla de negocio de creación/consulta/actualización de equipos, solo el nombre de los campos en la serialización HTTP y la presencia/ausencia de las rutas mock.

## Constraints

- **C1**: El nombre de campo objetivo es `org_id` (el que ya usa el backend, `CreateTeamRequest`/`TeamResponse`) — el frontend se alinea al backend, no al revés, siguiendo la convención ya establecida en el resto del proyecto (Zod-mirror 1:1 del contrato backend, ver `architecture.md` § Key Design Decisions).
- **C2**: Al remover los mocks BFF (FR3), cualquier test frontend que dependiera de `global.__mockTeams` para simular el flujo de creación de equipo debe migrarse a mockear `fetch`/MSW directamente, o a un test de integración que hable con el backend real — no puede quedar un test roto por la remoción del mock.
- **C3**: El equipo ya afirmó (`team.md` Q6) adoptar en frontend un patrón de manejo de errores equivalente al del backend (excepciones tipadas por dominio) como convención hacia adelante — este intent NO está obligado a implementar esa convención completa para `teamApi.ts`/`orgApi.ts` (fuera del alcance decidido en Q1-Q4), pero el fix no debe introducir un patrón de manejo de errores nuevo que la contradiga.

## Assumptions

- **A1**: El rewrite `fallback` en `next.config.ts:82-102` ya está correctamente configurado para reenviar `/api/v1/teams/**` al backend FastAPI una vez que los archivos de ruta mock se remuevan — no requiere cambios propios. _Owner: Code Generation, verificar al remover los mocks._
- **A2**: No existe ningún otro caller (fuera de `TeamForm.tsx`/`teamStore.ts`) que construya el payload de `teamApi.create()` con el nombre de campo viejo `organization_id` directamente — debe confirmarse con una búsqueda exhaustiva de call sites durante Code Generation antes de dar el fix por completo. _Owner: Code Generation._
- **A3**: El backend real (`team_router.py`) está desplegado y accesible en los entornos donde se verificará el fix (local/CI) — no requiere levantar infraestructura nueva más allá de lo que la suite de integración backend ya usa hoy (Postgres 17 vía Docker, per convención ya aprendida del proyecto). _Owner: Build and Test._

## Out of Scope

- Adoptar sistemáticamente en `orgApi.ts`/`teamApi.ts` el patrón de manejo de errores tipado por dominio (excepciones + handler centralizado) que el equipo afirmó como convención hacia adelante (`team.md` Q6) — queda para un intent dedicado a esa migración transversal.
- Migrar `onboarding/page.tsx`/`invite/[token]/page.tsx` de `useEffect` a React Query — ya registrado como deuda separada en el intent `260828-useeffect-to-react-query` (implementado en sesión previa), no relacionado con este fix.
- Cerrar la brecha de `fetchWithAuth` en `orgApi.ts`/`teamApi.ts` (ninguno de los dos usa el wrapper con auto-refresh de sesión en 401) — mencionado como oportunidad de mejora en `architecture.md`, pero no es parte del mismatch de contrato que este intent corrige.
- Cualquier test de Layer 3 para dominios distintos de `team` (p. ej. `organization`, `product`) — este intent agrega la instancia para `team` únicamente; extender el patrón a otros dominios es una decisión separada.

## Open Questions

Ninguna — Reverse Engineering ya resolvió la causa raíz completa y el mecanismo de shadowing, y las 4 decisiones de alcance quedaron confirmadas explícitamente por el usuario en Requirements Analysis (Q1-Q4, ver `requirements-analysis-questions.md`).

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-02T22:01:01Z
**Iteration:** 1

### Findings

| #   | Severity | Location          | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Recommendation                                                                                                                                                                |
| --- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Minor    | Todo el documento | `code-structure.md` (declarado en `consumes:` del stage, `conditional_on: brownfield`) nunca se cita por nombre de artefacto en la prosa — los hechos que provienen de él (`team_router.py:132-135` del codekb) se citan vía path de código real, y sí se nombra `business-overview.md`/`architecture.md`. Verificado: los datos son correctos y trazables al codekb, así que no es un gap de contenido — es un riesgo puramente mecánico frente al sensor `upstream-coverage`, que busca la referencia nominal al artefacto. | Si el sensor lo marca, agregar una mención explícita a `code-structure.md` junto a las citas de `team_router.py`/`create.py`/`response.py` — cambio cosmético, no bloqueante. |
| 2   | Minor    | NFR2              | "Sin cambio de comportamiento de negocio" es más difícil de convertir en un criterio pass/fail mecánico que el resto del documento (que sí es muy concreto) — queda acotado por la frase siguiente ("solo el nombre de los campos... y presencia/ausencia de las rutas mock"), pero un verificador en Build and Test se beneficiaría de un criterio más explícito (p. ej. "los códigos de status HTTP y la forma del payload, aparte de los nombres de campo renombrados, no cambian").                                       | No bloqueante — el acotamiento ya presente reduce la ambigüedad lo suficiente para Depth Minimal en un bugfix.                                                                |

### Summary

Documento sólido: cada FR/NFR cita archivo y línea real verificados contra el código (`teamApi.ts:40`, `create.py:12`, `response.py:44`, `schemas/teamApi.ts:31`, `TeamForm.tsx:149-152` — todos confirmados exactos), las cuatro decisiones de Q1-Q4 se reflejan sin contradicción ni expansión de alcance no aprobada, el Out of Scope excluye correctamente la deuda adyacente ya conocida (patrón de errores Q6, migración useEffect, gap de `fetchWithAuth`, Layer 3 para otros dominios), y cada FR tiene un criterio de pass/fail verificable. IDs bien formados y estables (FR{n}/FR{n}.{m}, NFR{n}). Los dos hallazgos son cosméticos/mecánicos y no bloquean el paso a la siguiente etapa.
