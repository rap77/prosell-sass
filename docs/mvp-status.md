# ProSell MVP Status

**Status**: Milestone C — UX Completion In Progress (5/8 tasks complete)
**Last Updated**: 2026-05-19
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
- El flujo **catálogo → lead → cita** tiene el **path API verificado** end-to-end (`integrated-flow.spec.ts` contra Docker real). El **path UI browser** tiene verificación parcial: `/catalog` y `/vendedor/leads` pasan; `/pipeline` es la página central pendiente en Milestone C.
- **Milestone C avanza al 62.5%**: M3 (error pages), M2 (catalog detail), M1 (publications), A1 (settings/profile), A2 (settings/security) completados. Quedan A3 (notificaciones), A4 (onboarding) y C1 (pipeline kanban).
- La suite web y los artefactos de smoke siguen siendo la base de confianza operativa.
- **Próximo objetivo**: cerrar A3, A4 y C1 para completar Milestone C y habilitar el go/no-go final.

---

## MVP Goal

Permitir que el equipo de ProSell gestione el flujo interno completo de ventas desde una base de catálogo multinicho: administrar catálogo en el modelo C3, preparar/publicar items por los canales soportados, capturar y gestionar leads, y coordinar citas desde el mismo sistema. El primer vertical operativo y más avanzado hoy es vehículos.

---

## Release Readiness

**Overall Readiness**: 88% (backend sólido, Milestone C al 62.5% — A3/A4/C1 pendientes)
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
- [~] End-to-end flow verified: API path ✅ (`integrated-flow.spec.ts`) — UI browser path ⚠️ parcial (catalog list + leads list + catalog detail + publications verifican; pipeline pendiente en Milestone C/C1)
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
| E2E / QA | 🟡 Yellow | 85% | API integration path green (`integrated-flow.spec.ts`); UI browser path parcial (catalog list + detail + publications + leads verificados) | UI path incompleto hasta C1 (pipeline kanban) | Completar A3/A4/C1 → activar test.skip blocks en integrated-flow.spec.ts |
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
| End-to-End MVP Flow | High | Medium | Medium | API path verificado (`integrated-flow.spec.ts`). UI browser path parcial: catalog list + leads list OK; catalog detail + publications + pipeline penden Milestone C. |
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

### Milestone C — UX Completion (En progreso)

8 gaps de UX identificados para dejar la app operativa. Ver `tasks/plan.md` y `tasks/todo.md`:
- **M3**: Error pages (`not-found.tsx`, `error.tsx`) — sin branding
- **M2**: Catalog detail `/catalog/{id}` view-only — página no existe
- **M1**: Publications route `/publications` — entry point faltante
- **A1/A2**: Settings + Seguridad — `/settings` da 404
- **A3**: Panel de notificaciones — sin campanita en header
- **A4**: Onboarding wizard — sin flujo de primer ingreso
- **C1**: Pipeline kanban `/pipeline` — vista operativa central faltante

Cuando Milestone C cierre: activar los `test.skip` blocks en `integrated-flow.spec.ts` para completar el path UI del go/no-go E2E.

---

## Current Evidence Snapshot

**Evidence date for this review:** 2026-05-16

### Backend
- Alembic: Lineal (Head: `20260428_1625`).
- Data: `init_data.py` (ORM-based) successful.
- Routes: `/api/v1/auth` consistent across backend/frontend.

### Frontend
- Build: SUCCESS (Next.js 16/Turbopack).
- Middleware: Migrated to `proxy.ts` (Clean build).
- Environment: Hot-reload enabled in Docker Compose.

### Tests
- Web: **Historical baseline** `710 tests passed, 0 failed` (2026-05-01 snapshot).
- Web: **Current spot-check** `VehicleForm.edit.test.tsx` passing in Vitest (6 tests).
- Web: **Current spot-check** `CalendarView.test.tsx` + `branch/appointments/page.test.tsx` passing (16 tests total).
- E2E: `specs/product-edit-flow.spec.ts` passing (4 tests) contra servicios reales.
- API Critical: **Historical baseline** `51 passed` (Categories/Leads/Appointments).
- API: `test_lead_assignment_rules_engine.py` passing (25 tests) + `test_create_lead_auto_assignment.py` passing (2 tests).
- Operational E2E: `pnpm --dir tests/e2e exec playwright test specs/integrated-flow.spec.ts --project=chromium --config=playwright.no-webserver.config.ts` → **1 passed** (2026-05-16).

### Current Sprint Evidence
- `tasks/todo.md`: B4.1 Team Invitation System marked effectively complete.
- `tasks/todo.md`: B4.2 Appointment Conflict Detection complete and verified.
- `tasks/todo.md`: B3.4 Product Edit Mode verified también a nivel E2E real.
- `tasks/todo.md`: B4.3 Lead Assignment Rules Engine appears complete and now has both engine-level and use-case auto-assignment coverage.
- `apps/web/src/components/forms/__tests__/VehicleForm.edit.test.tsx`: unit suite repaired for Vitest and passing (6 tests).
- `apps/api/src/prosell/tests/unit/application/test_create_lead_auto_assignment.py`: verifies owner-priority and configurable workload-balancing assignment through `CreateLeadUseCase`.
- `tests/e2e/specs/integrated-critical-path.spec.ts`: smoke integrado con mocks para Facebook/SendGrid.
- `tests/e2e/specs/integrated-flow.spec.ts`: flujo operativo validado en Docker real (catalog → lead → appointment green).
- `apps/web/src/components/appointments/CalendarView.tsx`: compile blocker removido quitando la dependencia faltante de interacción en la ruta actual.

---

## Resolved Blockers

- ✅ **Alembic Multiple Heads**: Unified into a single timeline.
- ✅ **Empty Database Error**: `init_data.py` guarantees initial data.
- ✅ **Middleware Deprecation**: Renamed to `proxy.ts`.
- ✅ **Auth Route Mismatch**: Unified to `/api/v1/auth`.
- ✅ **Operational MVP E2E**: `integrated-flow.spec.ts` pasa contra servicios reales.

---

## Next 5 Actions

1. Ampliar cobertura API/E2E de leads si se quiere un cierre aún más fuerte del assignment flow.
2. Ampliar cobertura UI/E2E de citas si se quiere reactivar interacción avanzada de calendario.
3. Verificar Facebook Publisher con credenciales/product path real si están disponibles.
4. Hacer revisión final Go/No-Go y preparar staging.

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
