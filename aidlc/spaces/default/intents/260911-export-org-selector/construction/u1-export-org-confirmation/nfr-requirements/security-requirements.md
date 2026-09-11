# Security Requirements — u1-export-org-confirmation

Formaliza `NFR1` de `requirements.md` ("Seguridad: gating por permiso
puntual, no por proxy de rol") con sub-IDs medibles, per
`functional-spec.md` (Q1 afirmada: sin chequeo de permiso propio, se
hereda el guard existente).

## NFR1.1 — Inalcanzabilidad de `viewingOrgId` sin permiso

**Target**: un usuario sin `ORG_ADMIN_VIEW_ALL` NUNCA puede tener
`organizationStore.viewingOrgId` seteado a una organización distinta a
la propia, en ningún momento de su sesión.

**Medible por**: test automatizado — `organizationStore.setViewingOrgId()`
retorna sin efecto (no-op) cuando `!userHasPermission(role,
Permission.ORG_ADMIN_VIEW_ALL)` (ya verificado contra el código real en
la revisión de Functional Design, `organizationStore.ts:361-367`).

## NFR1.2 — Autorización real en el backend, no en el frontend

**Target**: la decisión de autorización final para exportar el catálogo
de otra organización vive 100% en el backend
(`_check_org_scope_permission()`), no en este Unit. El badge de
confirmación de organización (AC1.1.5/AC1.1.6) es una capa de UX de
seguridad — NUNCA la barrera real de autorización.

**Medible por**: ya cubierto y testeado (10/10 tests) en el intent previo
`260910-export-cross-org` — este Unit no re-implementa ni debilita esa
barrera.

## NFR1.3 — Auditoría sin duplicar

**Target**: cada export cross-org queda auditado exactamente una vez, en
el backend (`logger.info()`, ya implementado).

**Medible por**: ya cubierto en `260910-export-cross-org` — este Unit no
agrega ni necesita un mecanismo de auditoría nuevo del lado frontend.

## Fuera de alcance (confirmado, no un gap)

- Ningún control de seguridad nuevo en este Unit — es 100% consumo de
  mecanismos ya auditados y probados.
- Sin superficie de ataque nueva: el badge no acepta input del usuario,
  no ejecuta código dinámico, no expone datos que el usuario no pudiera
  ya obtener a través del `OrganizationPicker` existente.

## Review

**Verdict:** READY

**Findings:**

1. [Severidad: Minor] — El sensor `upstream-coverage` va a fallar (`SENSOR_FAILED`, severidad advisory) porque ni `rules` ni `contract-summary` aparecen citados como token en ningún archivo generado por esta etapa. Verificado ejecutando el sensor directamente: `{"pass":false,...,"unreferenced":["rules","contract-summary"]}`. La causa es legítima, no un descuido: `domain-design/` y `contract-design/` de este intent solo contienen `memory.md` (ambas etapas quedaron SKIP — sin building blocks nuevos ni frontera cross-Unit, Unit único) y `functional-design` no produce `rules.md` para Unit kind `ui` (convención ya establecida en `project.md`, learning 260829-auth-navigation-refactor/260911-export-org-selector). Ninguno de los dos artefactos existe en ningún punto de este intent para poder citarlo. — Ubicación: `nfr-requirements-questions.md`, `security-requirements.md`, `performance-requirements.md`, `tech-stack-decisions.md` (ninguno menciona `rules` ni `contract-summary`). — Recomendación: no bloqueante (severidad advisory) — el gap es estructural y ya tiene precedente aceptado en este mismo intent (Functional Design lo resolvió con `status: N/A` explícito para el caso análogo de ACs sin `rules.md`); dejar constancia en el gate para que quede en el audit trail, sin necesidad de reabrir el artefacto.
2. [Severidad: Minor] — El piso mínimo de test afirmado en Practices Discovery (`team.md`, Q1) tiene 3 puntos: (1) regresión negativa de gating, (2) test de wiring del `organization_id`, (3) no-ruptura del consumo existente de `OrganizationPicker`. Solo el punto (1) tiene correlato explícito como NFR medible acá (`NFR1.1`). Los puntos (2) y (3) no aparecen como target NFR en ningún archivo de esta etapa. — Ubicación: `security-requirements.md` § NFR1.1–NFR1.3; `performance-requirements.md`. — Recomendación: no bloqueante — (2) y (3) son correctitud funcional/de wiring, no atributos de calidad NFR clásicos (performance/seguridad/escalabilidad/confiabilidad/observabilidad), y el propio `nfr-requirements-questions.md` no los reclama como NFR — corresponden a `unit-test-instructions.md` en Code Generation/Build and Test, no a esta etapa. Verificar en Build and Test que efectivamente se materialicen ahí.

Sin hallazgos Critical ni Major. `scalability-requirements.md`/`reliability-requirements.md`/`observability-requirements.md` están correctamente ausentes (`produces_kinds` las restringe a `[service]`, este Unit es `ui`). `security-requirements.md` formaliza NFR1 con sub-IDs medibles (NFR1.1–NFR1.3) consistentes con la resolución de Q1 de Functional Design (sin guard nuevo, hereda el existente) y con `functional-spec.md` § Workflow. El `N/A` de NFR2 en `traceability.json` tiene justificación suficiente y coherente con el hallazgo Minor ya señalado por el reviewer de Requirements Analysis (NFR2 es una restricción de convención de código, no un atributo de calidad clásico). `performance-requirements.md` es proporcional al alcance real — no inventa targets numéricos ficticios, y documenta explícitamente por qué no hace falta un presupuesto de latencia (sin fetch nuevo en el camino crítico del render).
