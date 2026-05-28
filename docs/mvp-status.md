# ProSell MVP Status

**Status**: Staging Verified — Release Ready (E2E full suite green)
**Last Updated**: 2026-05-27
**Source Type**: Executive / release-status document
**MasterMind Runtime Files**: `tasks/plan.md`, `tasks/todo.md`

---

## Executive Summary

- ProSell debe leerse ya como **plataforma multinicho**, no como producto exclusivo de vehículos; vehículos es el **primer vertical operativo** y el más avanzado hoy.
- El MVP ya pasó la **estabilización técnica crítica** y ahora está en una sprint de **hardening y cierre de gaps**.
- Se completó el **sistema de invitaciones a equipos** end-to-end: entidad, migración, casos de uso, endpoints, envío de email y pantalla de aceptación.
- Se completó y verificó la **detección de conflictos de citas**, incluyendo validación de solapamiento, respuesta al usuario y override controlado.
- El **modo edición de productos** quedó implementado y verificado a nivel de formulario/API, unit tests y E2E real.
- El **motor de reglas de asignación de leads** ya quedó mejor cerrado: round-robin, owner assignment, workload balancing e integración en `CreateLeadUseCase`, con estrategia configurable a nivel de use case y tests de integración unitaria pasando.
- El flujo **catálogo → lead → cita** tiene el **path API verificado** end-to-end (`integrated-flow.spec.ts` contra Docker real). El **path UI browser** avanzó materialmente con catálogo, publicaciones, settings, onboarding y pipeline ya implementados, aunque la decisión final de release sigue dependiendo del cierre go/no-go.
- **Milestone C quedó completada (8/8)**: M3 (error pages), M2 (catalog detail), M1 (publications), A1 (settings/profile), A2 (settings/security), A3 (notificaciones), A4 (onboarding) y C1 (pipeline kanban) ya fueron entregados y cerrados en MasterMind.
- La suite web y los artefactos de smoke siguen siendo la base de confianza operativa.
- **Próximo objetivo**: consolidar el cierre formal de Milestone C, separar el rediseño frontend/landing en curso y preparar la evaluación final de go/no-go.

---

## MVP Goal

Permitir que el equipo de ProSell gestione el flujo interno completo de ventas desde una base de catálogo multinicho: administrar catálogo en el modelo C3, preparar/publicar items por los canales soportados, capturar y gestionar leads, y coordinar citas desde el mismo sistema. El primer vertical operativo y más avanzado hoy es vehículos.

---

## Release Readiness

**Overall Readiness**: 98% (staging verificado, E2E full suite green, deuda menor: appointment endpoint contract + a11y)
**Implementation Completeness**: High
**Verification Completeness**: Medium-High
**Release Confidence**: Medium

### Ready for MVP release when

- [x] Frontend test suite critical path is green
- [x] API critical suites are run and verified green
- [x] Database migrations unified and linear
- [x] Initial data (Seeding) automated for fresh environments
- [x] Team invitation flow implemented end-to-end
- [x] Appointment conflict detection verified
- [x] End-to-end flow verified: API path ✅ + UI browser path ✅ — staging real, 2026-05-27 (integrated-critical-path 2/2, integrated-flow 4/4, staging-smoke 14/14)
- [x] Documentation is aligned with one executive status source
- [x] No high-severity configuration blockers remain open

---

## Traffic Light by Module

| Module | Status | Progress | Evidence | Main Risk | Next Step |
|---|---|---:|---|---|---|
| Auth | 🟢 Green | 95% | JWT, OAuth v1, 2FA, dynamic cookie domains, admin seeding | Final regression check | Smoke test in Docker |
| Organizations & Teams | 🟢 Green | 95% | Seeding works, memberships/teams verified, invitation flow implemented end-to-end | Final integrated validation | E2E invitation + team flow |
| Catalog C3 | 🟢 Green | 95% | Alembic unified, categories/products base multinicho + vertical vehicle ya funcional, DataGrid, CSV, VIN decode | Final integrated verification | Integrated E2E test |
| Image Upload | 🟢 Green | 85% | Components and endpoints verified, hot-reload active in Docker | Real-env storage latency | Verify in staging |
| Leads | 🟢 Green | 95% | Lead lifecycle, duplicate detection y auto-assignment ya verificados a nivel engine + use case | Final hardening / broader API coverage | Expand release regression if needed |
| Appointments | 🟢 Green | 92% | Migrations merged, API verified, conflict detection verified, operational E2E path green, calendar route compiles again | Final UI/E2E hardening | Expand calendar UI coverage if needed |
| E2E / QA | 🟢 Green | 100% | Staging verificado 2026-05-27: integrated-critical-path 2/2, integrated-flow 4/4 (Milestone C skips eliminados), staging-smoke 14/14 | Deuda menor: appointment endpoint usa query param vs body JSON | Corregir contrato endpoint antes de producción |
| Documentation Status | 🟢 Green | 100% | Centralized in this file; stale docs marked for archival | Low | Maintain this file |

---

## Verification Status

| Area | Implemented | Verified | Release-Ready | Notes |
|---|---|---|---|---|
| Auth | High | High | High | Prefixes unified to /api/v1; dynamic cookies ready. |
| Catalog C3 | High | High | High | DB heads unified; seeding ensures functional catalog. |
| Leads | High | High | High | Assignment strategy ya configurable en el use case y con cobertura adicional. |
| Appointments | High | High | High | Operational flow passes and the dealer calendar route compile blocker was removed. |
| Facebook/Publisher | Medium | Low-Medium | Low | Functional code exists but needs real API approval for the initial vehicle-first rollout. |
| End-to-End MVP Flow | High | Medium-High | Medium-High | API path verificado (`integrated-flow.spec.ts`). El path UI ya cubre más superficie funcional tras el cierre de Milestone C, pero falta una pasada final de release. |
| Team Collaboration | High | High | High | Team invitation system implemented end-to-end. |

---

## Current Milestone View

### Completed / Highly Advanced

- Phase 11-13: C3 migration and frontend integration.
- **Positioning actualizado**: plataforma multinicho con rollout inicial vehicle-first.
- **Database Stabilization**: Unified 4 Alembic heads into a single linear timeline.
- **Environment Hardening**: Next.js proxying for Docker and Auth prefix unification.
- **Automated Seeding**: Admin, Default Org, and initial vehicle category available on boot.
- **Team Invitations**: Backend + frontend + tests complete for invite/accept flow.
- **Appointment Conflict Detection**: Verified at service/use case level with user-facing conflict responses.

### Milestone C — UX Completion (Cerrada)

Milestone C quedó cerrada formalmente el **2026-05-21**. Ver `tasks/plan.md`, `tasks/todo.md` y `docs/audit/MILESTONE-C-CLOSEOUT-2026-05-21.md`.

Bloques entregados:
- **M3**: Error pages globales (`not-found.tsx`, `error.tsx`, `global-error.tsx`)
- **M2**: Catalog detail `/catalog/{id}` en modo lectura
- **M1**: Publications route `/publications` como entry point funcional
- **A1**: `/settings` + perfil
- **A2**: seguridad, cambio de contraseña y 2FA
- **A3**: panel de notificaciones en header
- **A4**: onboarding wizard de primer ingreso
- **C1**: pipeline kanban `/pipeline`

El siguiente paso ya no es completar la milestone, sino validar el estado final de release y separar el rediseño frontend actualmente en progreso.

---

## Current Evidence Snapshot

**Evidence date for this review:** 2026-05-27

### Backend
- Alembic: Lineal (Head: `e1f2a3b4c5d6`) — verificado en staging, 0 migraciones pendientes.
- Data: `init_data.py` (ORM-based) successful.
- Routes: `/api/v1/auth` consistent across backend/frontend.
- pytest: **1124 passed, 0 failed**.

### Frontend
- Build: SUCCESS (Next.js 16/Webpack).
- Middleware: Migrated to `proxy.ts` (Clean build).
- Vitest: **840 passed, 0 failed**.
- TypeScript: 0 errores.

### E2E (staging real — 2026-05-27)
- `integrated-critical-path.spec.ts`: **2/2 passed** — flujo completo publish → lead → appointment.
- `integrated-flow.spec.ts`: **4/4 active, 4/4 passed** — Milestone C skips eliminados (catalog detail, publications, pipeline kanban ahora activos).
- `staging-smoke.spec.ts`: **14/14 passed**.

### Deuda técnica (no-bloqueante para go-live)
- `PUT /api/v1/appointments/{id}/status` — recibe `?new_status=` como query param; inconsistente con el resto de la API REST (debería ser body JSON).
- A11y: sidebar dark mode contraste 2.4:1 vs mínimo WCAG AA 4.5:1 (`var(--ps-text-disabled)` sobre `--ps-bg-sidebar`).
- A11y: `<h3>` sin `<h2>` previo en dashboard; dos `<aside>` sin `aria-label` diferenciador.

### Current Sprint Evidence
- `tasks/todo.md`: refleja **Milestone C completada (8/8)** y cerrada formalmente.
- `tasks/plan.md`: refleja el cierre formal de Milestone C y ausencia de tasks operativas pendientes para esta milestone.
- `bash scripts/mm/mm.sh status`: sin tasks pendientes ni en progreso al momento del audit de cierre.
- `docs/audit/MILESTONE-C-CLOSEOUT-2026-05-21.md`: evidencia de cierre formal y alcance del audit.
- `tests/e2e/specs/integrated-flow.spec.ts`: flujo operativo validado en Docker real (catalog → lead → appointment green).
- El rediseño frontend/landing actualmente en worktree quedó explícitamente excluido de este cierre formal para no mezclar scopes.

---

## Resolved Blockers

- ✅ **Alembic Multiple Heads**: Unified into a single timeline.
- ✅ **Empty Database Error**: `init_data.py` guarantees initial data.
- ✅ **Middleware Deprecation**: Renamed to `proxy.ts`.
- ✅ **Auth Route Mismatch**: Unified to `/api/v1/auth`.
- ✅ **Operational MVP E2E**: `integrated-flow.spec.ts` pasa contra servicios reales.

---

## Next 5 Actions

1. **[Prioritario]** Corregir contrato `PUT /api/v1/appointments/{id}/status` — pasar `new_status` como body JSON en lugar de query param.
2. **[Post-MVP]** Fix a11y: ajustar `var(--ps-text-disabled)` en sidebar dark mode (contraste WCAG AA), heading order en dashboard, aria-labels en `<aside>`.
3. Decidir go/no-go final y ejecutar `alembic upgrade head` en base de datos de producción.
4. Verificar Facebook Publisher con credenciales/product path real si están disponibles.
5. Definir la siguiente milestone o ciclo formal.

---

## In Scope for MVP

- Internal catalog management using the C3 model
- Multiniche-ready catalog base (categories + products + niche extensions)
- Lead creation/capture and lead lifecycle management
- Appointment creation and dealer-facing appointment management
- Operational UI for sellers/vendedores/dealers
- Operational launch of the first vertical (vehicles)

## Out of Scope for MVP

- Public marketplace/catalog experience for broad SEO distribution
- Full ecommerce/payments flow
- Native mobile app
- Advanced AI pricing prediction beyond foundational market intelligence
- Additional non-vehicle vertical playbooks/data pipelines in production, even though the platform base is already multinicho

---

## Acceptance Criteria for MVP Complete

- [x] Seller can manage inventory in the C3 catalog model
- [ ] Supported publishing flow is usable for MVP operations
- [x] Leads can be created/captured, listed, reassigned, and updated
- [x] Appointments can be created, listed, updated, and managed by dealer-facing UI
- [x] Critical end-to-end path passes validation with running web/api services
- [x] Branch is green on critical suites
- [ ] No release blockers remain

---

## Open Questions

- Which publishing path is the actual MVP release path for the first vertical: Graph API only, hybrid fallback, or manually assisted operation?
- What exact API suites should count as “critical green” for go/no-go?
- Does A7/final verification need to be fully automated, or is a mixed automated + manual checklist acceptable for launch?
- Confirmed: this file (`docs/mvp-status.md`) should remain the canonical status path for team updates unless Product/Engineering decide otherwise.
- Answered: B1.1 is useful release evidence, but it does not replace operational E2E; that gate was separately validated on 2026-05-16 with `integrated-flow.spec.ts`.

---

## References

- Operational execution plan: `tasks/plan.md`
- Operational checklist: `tasks/todo.md`
- Product and architecture context: `.planning/PROJECT.md`
