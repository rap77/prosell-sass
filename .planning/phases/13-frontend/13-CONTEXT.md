# Phase 13 — Frontend: VehicleForm, DataGrid, CSV Upload

> Brain-informed context for Phase 13 planning
> Generated: 2026-04-12T22:00:00Z
> Status: APPROVED_WITH_CONDITIONS (Global Rating: 82/100)

---

## Executive Summary

Phase 13 conecta el frontend existente al backend C3 implementado en Phase 12. **No es un rediseño** — es actualizar componentes para usar endpoints reales en lugar de mocks/hardcoded data.

**Brain #7 Verdict**: APPROVED_WITH_CONDITIONS (82/100)
- ✅ ROI positivo: real integration vale la deuda de tests
- ⚠️ Riesgo medio: test flakiness surge probable
- 🔧 Condiciones: contract tests + smoke tests + Lighthouse CI

---

## Key Decisions (From Brain Consultation)

### Decision #1: Two-Step Submit Pattern ✅
**CHOSEN**: Backend auto-creates vehicle if VIN present (Option B)

**Why**:
- 99% de vehicles tienen VIN desde el inicio
- Single network roundtrip = más rápido UX
- Rollback logic en backend (transaccional)

**Implementation**:
- Frontend llama `POST /api/v1/products` con `{ name, price, category_id, attributes: { vin, make, model, ... } }`
- Backend crea Product Y Vehicle en la misma transacción si `vin` presente
- Frontend no maneja rollback — backend lo hace

**Fallback**: Si no hay VIN (producto genérico), crear solo Product.

---

### Decision #2: Category Loading Strategy ✅
**CHOSEN**: Load all ~300 categories at once, cache 5min client-side

**Why**:
- 300 categories × ~100 bytes = 30KB payload (negligible)
- Categorías cambian rara vez (stale 5min es aceptable)
- Elimina loading states, race conditions, complejidad

**Implementation**:
```typescript
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: fetch('/api/v1/categories'),
  staleTime: 5 * 60 * 1000, // 5 min
})
```

**Performance**: 30KB over 3G = ~100ms. Aceptable.

---

### Decision #3: DataGrid Pagination Strategy ✅
**CHOSEN**: Cursor-based infinite scroll (useInfiniteQuery) for MVP

**Why**:
- "Scanning inventory" = scroll behavior natural
- TanStack Virtual ya implementado (60fps con 1000+ rows)
- Cursor pagination más estable que offset

**Implementation**:
```typescript
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['vehicles'],
  queryFn: ({ pageParam }) => fetch(`/api/v1/vehicles?cursor=${pageParam}&limit=50`),
  getNextPageParam: (lastPage) => lastPage.next_cursor
})
```

**Fallback**: Si usuarios piden "jump to page 47", agregar paginación numérica después.

---

### Decision #4: Attribute Schema Rendering ✅
**CHOSEN**: Hardcoded conditional render now, FormBuilder deferred

**Why**:
- FormBuilder genérico = 2-3 semanas (validation, error handling, dynamic types)
- Categorías actuales tienen atributos conocidos (hardcodear 5-10 conditionals)
- YAGNI principle: no construir abstracción hasta 3+ use cases

**Implementation**:
```typescript
{category?.attribute_schema?.year && (
  <FormField name="attributes.year">
    <Input type="number" />
  </FormField>
)}
{category?.attribute_schema?.make && (
  <FormField name="attributes.make">
    <Select options={FB_BRANDS} />
  </FormField>
)}
```

**Technical debt**: Aceptable. Revisar cuando category count > 20 o attribute complexity explota.

---

### Decision #5: E2E Test Strategy ✅
**CHOSEN**: Smoke tests (20) → implement → full suite (210)

**Why**:
- 210 tests × breaking changes = costo upfront masivo
- Smoke tests cubren 80% de critical paths
- Parallel development reduce WIP time

**Threshold**: Si smoke test failure rate > 20%, parar y arreglar arquitectura.

---

## Tradeoffs

### ✅ What We Gain
| Benefit | Impact |
|---------|--------|
| **Real backend integration** | Frontend no longer mocks, actual data flow |
| **Product-Vehicle separation** | Clean domain model (generic products + specific vehicles) |
| **Category API** | Dynamic categories, no frontend redeploys |
| **Performance** | Cursor pagination + caching = sub-100ms loads |
| **Test coverage** | 210 E2E tests catch regressions |

### ❌ What We Lose
| Cost | Impact |
|------|--------|
| **Breaking 24 VehicleForm tests** | Test update overhead (4-6 hours) |
| **No FormBuilder** (hardcoded attributes) | Technical debt, slower category onboarding |
| **Mock data removed** | Demo/development requires seeded DB |
| **API latency** | No more instant local mock responses |

### 🎯 Net Assessment
**ROI Positive**. Los gains (real integration, scalability) outweigh los costs (test updates, deuda temporal).

---

## Risks & Mitigations

### 🔴 High Risk

#### Risk #1: Data Migration Clash
**Problem**: Frontend expects one call, backend requiere dos (o vice versa). Submit fails silently.

**Mitigation**:
- ✅ Elegir Option B (backend auto-create) — elimina el problema
- Correr smoke tests **antes** de merge a main
- Feature flag two-step submit, monitorear error rate

**Probability**: 40% → 10% (con Option B) | **Impact**: Blocking | **Mitigation Cost**: 1 day

---

#### Risk #2: Category Schema Mismatch
**Problem**: Frontend espera `attribute_schema` format, backend retorna estructura diferente.

**Mitigation**:
- Documentar DTO en OpenAPI spec ANTES de implementación
- Contract test: `GET /api/v1/categories` → validar JSON Schema
- TypeScript types desde OpenAPI (vía `openapi-typescript`)

**Probability**: 30% | **Impact**: 1-2 day delay | **Mitigation Cost**: 1 day

---

### 🟡 Medium Risk

#### Risk #3: Test Flakiness Surge
**Problem**: Real API calls → timing-dependent tests → flaky assertions.

**Mitigation**:
- Agregar `waitForResponse()` guards en Playwright
- Mock SOLO deps externas (NHTSA VIN API), no APIs internas
- Flakiness threshold: <1% para full suite, 0% para smoke

**Probability**: 60% | **Impact**: 2-3 day debugging | **Mitigation Cost**: Ongoing

---

#### Risk #4: Performance Regression
**Problem**: 1000+ vehicles en DataGrid → render lag, memory spike.

**Mitigation**:
- ✅ Virtualization (TanStack Virtual) es no negociable
- Lighthouse CI: Performance score < 90 = fail build
- Load test: 1000 rows en < 2s en hardware mediano

**Probability**: 25% | **Impact**: 1-2 day optimization | **Mitigation Cost**: 1 day setup

---

## Dependencies

### Critical Path (Blocking)
```
Phase 13.1 (VehicleForm Two-Step)
├─ Backend: POST /products debe retornar product_id
├─ Backend: Si vin presente, auto-crear vehicle
└─ Frontend: useMutation con single call

Phase 13.2 (Category API)
├─ Backend: GET /api/v1/categories endpoint
├─ Backend: DTO con attribute_schema field
└─ Frontend: useQuery con 5min staleTime

Phase 13.3 (DataGrid Real Data)
├─ Backend: GET /api/v1/vehicles con cursor pagination
├─ Backend: VehicleWithProduct DTO (joined fields)
└─ Frontend: useInfiniteQuery + virtualization
```

### Parallelizable
- CSV upload progress bar (independiente de DataGrid)
- E2E test updates (pueden correr alongside implementation)
- Category search/fuzzy matching (frontend-only, usa cached data)

### External Dependencies
- **NHTSA VIN API**: Ya integrado, sin cambios
- **DigitalOcean Spaces**: Ya implementado para image upload
- **PostgreSQL**: DB existente, migraciones listas

---

## Second-Order Effects

### Consequence #1: Developer Experience Shift
**What**: Frontend devs ya no pueden correr app con `pnpm dev` solo. Necesitan backend + DB seeded.

**Effect**:
- Local dev setup time: 5 min → 15 min
- Onboarding new devs: +30 min
- Docker Compose se vuelve mandatory para local dev

**Mitigation**: Documentar "One-Command Setup" en README, agregar `make dev` script.

---

### Consequence #2: Demo/Storytelling Impact
**What**: Product demos ahora requieren real data (o seeded DB). No más "perfect" mock data.

**Effect**:
- Sales demos necesitan data prep script
- Staging env debe estar seeded con inventory realista
- "What if category X is empty?" = manual seeding

**Mitigation**: Agregar `make seed-demo-data` script con 50 vehicles diversos.

---

### Consequence #3: Test Maintenance Debt
**What**: 210 tests × API changes = mantenimiento ongoing. Cada cambio de backend schema rompe frontend tests.

**Effect**:
- QA team velocity -20% (más test updates)
- Release cycle +1 day (test fixing)
- Flakiness hunting = quarterly fire drill

**Mitigation**: 
- Contract tests como guardrails
- PACT testing para endpoints críticos (future)
- Monocle timers: si test fixing > 20% dev time, refactor test strategy

---

## Implementation Constraints

From BRAIN-FEED.md — active constraints for this phase:

- ✅ **Multi-tenant**: All data must have `tenant_id` — hard constraint
- ✅ **Clean Architecture**: Domain layer cannot have external dependencies
- ✅ **Server Components**: Default to Server Components, only 'use client' when necessary
- ✅ **SC-01**: Zustand persist only preferences, NOT auth/transient data
- ✅ **Zero Trust**: Middleware validates auth/role/tenant at edge
- ✅ **React 19 patterns**: No useCallback, no useMemo (Compiler handles it)

---

## Success Criteria (From ROADMAP.md)

1. ✅ VehicleForm submits `POST /api/v1/products` + `POST /api/v1/vehicles` (two-step) OR single call with auto-create
2. ✅ Category dropdown en VehicleForm carga desde `GET /api/v1/categories` (no hardcoded options)
3. ✅ DataGrid renders vehicles desde `GET /api/v1/vehicles` join query (includes product name, price, status)
4. ✅ Bulk CSV upload mapea CSV columns a new products+vehicles schema y crea ambos records por fila
5. ✅ VIN decode flow sigue funcionando end-to-end en VehicleForm (fields populated from NHTSA)
6. ✅ All existing Vitest component tests pass; new tests added for changed components

---

## Preconditions (Must Be True BEFORE Starting)

### Backend (Phase 12) — Already Complete ✅
- [x] `POST /api/v1/products` endpoint implemented
- [x] `POST /api/v1/vehicles` endpoint implemented
- [x] `GET /api/v1/categories` endpoint implemented
- [x] `GET /api/v1/vehicles` endpoint implemented with join
- [x] ProductResponse, VehicleResponse, CategoryResponse DTOs defined

### Testing Infrastructure — Must Create
- [ ] Smoke test suite created (`tests/e2e/smoke.spec.ts`) — 20 critical tests
- [ ] Contract tests for `/categories` and `/vehicles` endpoints (OpenAPI validation)
- [ ] Lighthouse CI configured (Performance score < 90 = fail)
- [ ] Migration guide for updating 24 VehicleForm tests

### Documentation — Must Create
- [ ] OpenAPI spec for `/categories` and `/vehicles` endpoints
- [ ] "One-Command Setup" guide in README
- [ ] `make seed-demo-data` script for demos/staging

---

## Next Steps After Planning

1. **Confirm backend decision**: Auto-create vehicle if VIN present? (Si ya está implementado, validar)
2. **Write OpenAPI spec** para `/categories` y `/vehicles` antes de implementación
3. **Set up smoke tests** (20 tests) como baseline
4. **Create migration guide** para actualizar 24 VehicleForm tests
5. **Start Phase 13.1** con backend auto-create pattern

**Estimated Timeline**: 2-3 weeks (1 developer, test updates en paralelo)

---

## Brain #7 Final Verdict

**Status**: APPROVED_WITH_CONDITIONS

**Global Confidence Rating**: 82/100

**Breakdown**:
- **ROI**: 90/100 (real integration vale la deuda de tests)
- **Technical Feasibility**: 85/100 (patrones son bien entendidos)
- **Risk Mitigation**: 75/100 (algunos riesgos lack mitigaciones baratas)
- **Team Capability**: 90/100 (team ha shipped features similares)

**Why not 90+?**
- Attribute schema hardcoding = technical debt con payoff incierto
- Test flakiness surge es probable y caro de debuggear
- Dos-step submit (si elegido) agrega failure modes

**Recommendation**: Proceed con Phase 13.1 (VehicleForm), pero reassess después de smoke test pass rate < 80%. Si stuck, pausar y refactor backend para soportar single-call create.

---

## Must-Have Conditions (From Brain #7)

1. ✅ **Choose Option B** for Decision #1 (backend auto-creates vehicle if VIN present)
2. ✅ **Implement Option C** for Decision #5 (smoke tests → implement → full suite)
3. ✅ **Add contract tests** for `/categories` and `/vehicles` endpoints (OpenAPI validation)
4. ✅ **Set up Lighthouse CI** (Performance score < 90 = fail)
5. ✅ **Document migration guide** for test updates (before starting Phase 13.1)

---

## Nice-to-Have Conditions (Should-Haves)

- 📝 Add `make seed-demo-data` script for demos/staging
- 📝 Set up Sentry RUM before full rollout
- 📝 Document "One-Command Setup" in README

---

*This file will be consumed by the GSD planner (gsd:plan-phase skill) to generate detailed implementation plans.*
