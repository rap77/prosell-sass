# Workflow: Backend Auth System

> **Generated**: 2026-02-11 | **Source PRP**: `PRPs/auth-system.md`
> **Strategy**: Systematic | **Depth**: Deep
> **Status**: PLAN CREATED (Not yet executed)

---

## Executive Summary

**Current State**: Backend auth code was implemented on 2026-02-06 (~65 production files) but has **ZERO tests** and several security/feature gaps. Frontend is 100% complete (316 tests, 91.57% coverage).

**Goal**: Validate, test, fix, and complete the backend auth system to production-ready status.

**Approach**: Validate-first (ensure existing code works before adding new features).

---

## Phase Map

```
Phase 0: Environment & Smoke Test ──> Phase 1: Domain Tests ──> Phase 2: Service Tests
                                                                        |
Phase 5: OAuth Implementation <── Phase 4: API Integration Tests <── Phase 3: Use Case Tests
        |
Phase 6: Security Hardening ──> Phase 7: Performance & Monitoring ──> Phase 8: Frontend Integration
```

**Total**: ~38 tasks across 9 phases | ~347 estimated backend tests

---

## Workflow Files

| File                                                   | Phases     | Description                                          |
| ------------------------------------------------------ | ---------- | ---------------------------------------------------- |
| [`phase-0-environment.md`](./phase-0-environment.md)   | Phase 0    | Environment validation, Docker, Alembic, smoke tests |
| [`phases-1-4-testing.md`](./phases-1-4-testing.md)     | Phases 1-4 | All unit + integration tests (critical path)         |
| [`phase-5-oauth.md`](./phase-5-oauth.md)               | Phase 5    | OAuth implementation - Task #18 from PRP             |
| [`phases-6-8-hardening.md`](./phases-6-8-hardening.md) | Phases 6-8 | Security, monitoring, frontend integration           |

---

## Execution Order & Parallelism

### Sequential (must be in order)

```
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
```

### Parallel (can run after Phase 4)

```
Phase 5 (OAuth)          --> Phase 6 (Security) --> Phase 7 (Monitoring)
Phase 8 (FE Integration) --> (can start after Phase 4 passes)
```

### Critical Path (minimum to connect FE to tested backend)

```
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 8
```

---

## Coverage Targets

| Layer           | Target | Method                                         |
| --------------- | ------ | ---------------------------------------------- |
| Domain entities | 90%+   | `pytest --cov=prosell.domain`                  |
| Use cases       | 85%+   | `pytest --cov=prosell.application`             |
| Services        | 80%+   | `pytest --cov=prosell.infrastructure.services` |
| API endpoints   | 70%+   | `pytest --cov=prosell.infrastructure.api`      |
| Overall backend | 80%+   | `pytest --cov=prosell`                         |

## Test Count Targets

| Phase                    | Expected Tests |
| ------------------------ | -------------- |
| Phase 1: Domain          | ~57            |
| Phase 2: Services        | ~43            |
| Phase 3: Use Cases       | ~72            |
| Phase 4: API Integration | ~40            |
| Phase 5: OAuth           | ~91            |
| Phase 6: Security        | ~31            |
| Phase 7: Monitoring      | ~13            |
| **TOTAL**                | **~347**       |

---

## Final Validation Checklist

- [ ] `pyright` - Zero type errors
- [ ] `ruff check .` - Zero linting errors
- [ ] `ruff format --check .` - All files formatted
- [ ] `pytest` - All tests pass
- [ ] `pytest --cov` - Coverage targets met
- [ ] Swagger docs accurate and complete
- [ ] No hardcoded secrets in code
- [ ] All domain exceptions mapped to HTTP status codes
- [ ] PRP checklist items all checked off

---

## Risk Register

| Risk                                        | Impact | Mitigation                                        |
| ------------------------------------------- | ------ | ------------------------------------------------- |
| Existing backend code has bugs              | High   | Phase 0 smoke test catches early                  |
| Test DB setup complexity (async SQLAlchemy) | Medium | SQLite async for unit, PostgreSQL for integration |
| OAuth provider API changes                  | Low    | Mocked providers in tests, manual real API test   |
| Rate limiting interferes with tests         | Medium | Disable rate limiting in test environment         |
| JWT key management in tests                 | Low    | Generate test keys in conftest.py                 |
| Alembic migration conflicts                 | Medium | Fresh DB per test run                             |

---

## Post-Workflow Actions

1. Update PRP checklist (`PRPs/auth-system.md`) - mark all backend items `[x]`
2. Write Serena memory with final status
3. Update `CLAUDE.md` if new patterns/conventions discovered
4. Create PR for backend auth system
5. Plan next feature (vehicle scraping? marketplace?)

---

**Next Step**: `/sc:implement` starting with Phase 0

```
/sc:implement Phase 0 - Environment Validation & Smoke Test
```
