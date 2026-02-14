# PRP: Foundation - Base Pydantic Models & Dependency Cleanup

> **Priority**: P0 | **Estimate**: 2 hours | **Sprint**: Pydantic Migration
> **Created**: 2026-02-14 | **Status**: Draft | **Confidence Score**: 9/10

---

## 1. Overview

### 1.1 Summary
Create base Pydantic models for domain layer and clean up phantom dependency (`python-jose`). This is Phase 1 of 8-phase Pydantic migration.

### 1.2 Dependencies
- [ ] Phase 0: Plan exists at `docs/plans/2026-02-14-pydantic-stack-refactoring.md`
- [ ] Existing tests pass before changes

### 1.3 Links
- Plan: `docs/plans/2026-02-14-pydantic-stack-refactoring.md`
- Pydantic Docs: https://docs.pydantic.dev/2.12/api/config/

---

## 2. Requirements

### 2.1 User Stories

#### US-PYD-001: Create Base Pydantic Models
**As a** Developer
**I want** Base Pydantic models for domain entities, value objects, and events
**So that** All domain objects can inherit Pydantic features (validation, serialization, etc.)

**Acceptance Criteria**:
```gherkin
Scenario: DomainModel base class exists
  GIVEN a need for mutable domain entities
  WHEN I create DomainModel(BaseModel)
  THEN it should have validate_assignment=True, from_attributes=True
  AND should be mutable (frozen=False)

Scenario: ValueObject base class exists
  GIVEN a need for immutable value objects
  WHEN I create ValueObject(BaseModel)
  THEN it should be frozen=True
  AND should strip whitespace from strings
```

#### US-PYD-002: Remove Phantom Dependency
**As a** Developer
**I want** Remove unused python-jose dependency
**So that** Dependencies are clean and only what's actually used

**Acceptance Criteria**:
```gherkin
Scenario: Remove python-jose
  GIVEN pyproject.toml has python-jose[cryptography]>=3.3.0
  AND project uses pyjwt, not python-jose
  WHEN I remove python-jose from dependencies
  THEN only pyjwt should remain
  AND imports should still work
```

### 2.2 Functional Requirements
- [ ] FR-001 Create `domain/base.py` with DomainModel, ValueObject, DomainEvent
- [ ] FR-002 Remove `python-jose[cryptography]` from `apps/api/pyproject.toml`
- [ ] FR-003 Verify existing tests still pass after changes

### 2.3 Non-Functional Requirements
- **Performance**: Validation on assignment adds minimal overhead
- **Security**: Pydantic validation prevents invalid data states
- **Scalability**: Base models are reusable across all domain objects

---

## 3. Technical Context

### 3.1 Tech Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Python | 3.13+ | PEP 695 type aliases |
| Pydantic | 2.12.0+ | BaseModel, ConfigDict, Field, field_validator |
| Pydantic Settings | 2.7.0+ | Used in config.py (not touched in this phase) |

### 3.2 Key Libraries

```bash
# Already installed
pydantic>=2.12.0
pyjwt>=2.9.0  # Used, NOT python-jose
pytest>=8.3.0
```

### 3.3 External Documentation
- **Pydantic ConfigDict**: https://docs.pydantic.dev/2.12/api/config/
- **Pydantic Field**: https://docs.pydantic.dev/2.12/api/fields/
- **Pydantic field_validator**: https://docs.pydantic.dev/2.12/concepts/validators/

---

## 4. Implementation Blueprint

### 4.1 Architecture Overview

```mermaid
flowchart TD
    A[Start] --> B[Verify Tests Pass]
    B --> C[Create domain/base.py]
    C --> D[Define DomainModel]
    C --> E[Define ValueObject]
    C --> F[Define DomainEvent]
    D --> G[Remove python-jose]
    E --> G
    F --> G
    G --> H[Run All Tests]
    H --> I[Commit Changes]
```

### 4.2 Implementation Steps

#### Step 1: Verify Tests Pass Before Changes
**Files to check**: `apps/api/tests/`

```bash
cd apps/api && uv run pytest -v
```

**Expected**: All 129 domain tests pass

**Gotchas**:
- If tests fail, fix them BEFORE proceeding
- This is the baseline for all subsequent phases

#### Step 1: Create Feature Branch for Phase 1

**Create and checkout feature branch**

```bash
# Create and checkout feature branch
git checkout -b feature/fase-1-foundation
```

### Step 2: Verify Tests Pass Before Changes
**Files to create**:
- `apps/api/src/prosell/domain/base.py` (NEW)

**Implementation**:
```python
"""Base Pydantic models for the domain layer."""
from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DomainModel(BaseModel):
    """Base for all domain entities."""

    model_config = ConfigDict(
        frozen=False,           # Entities are mutable
        str_strip_whitespace=True,
        validate_assignment=True,  # Validates on every assignment
        from_attributes=True,     # Allows model_validate() from ORM models
    )


class ValueObject(BaseModel):
    """Base for all value objects (immutable)."""

    model_config = ConfigDict(
        frozen=True,            # Value objects are immutable
        str_strip_whitespace=True,
    )


class DomainEvent(BaseModel):
    """Base for all domain events (immutable)."""

    model_config = ConfigDict(frozen=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

**Gotchas**:
- Don't import `uuid4` here - entities generate their own UUIDs
- `frozen=False` for DomainModel because entities need mutation methods
- `validate_assignment=True` ensures Pydantic validates on EVERY field assignment
- `from_attributes=True` is CRITICAL for Phase 4 (repository integration)

#### Step 3: Remove python-jose Dependency
**Files to modify**:
- `apps/api/pyproject.toml` (line 14)

**Before**:
```toml
dependencies = [
    # ...
    "python-jose[cryptography]>=3.3.0",
    "pyjwt>=2.9.0",
    # ...
]
```

**After**:
```toml
dependencies = [
    # ...
    "pyjwt>=2.9.0",
    # ...
]
```

**Gotchas**:
- Project ONLY uses `pyjwt` (imports in `infrastructure/services/jwt_service.py`)
- Verify no imports of `jose` exist: `rg "from jose" apps/api/src/`
- This is a phantom dependency from early development

---

## 5. Code Patterns & Examples

### 5.1 Pydantic ConfigDict Pattern

**Reference**: Pydantic 2.12 documentation

```python
from pydantic import BaseModel, ConfigDict

class DomainModel(BaseModel):
    model_config = ConfigDict(
        frozen=False,              # mutable=True, frozen=False
        str_strip_whitespace=True,
        validate_assignment=True,
        from_attributes=True,
    )
```

### 5.2 Field Default Factory Pattern

**Reference**: domain/base.py

```python
from pydantic import Field
from datetime import UTC, datetime

timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

**Why**: `default_factory` creates new datetime for each instance, not shared value.

---

## 6. Validation Gates

### 6.1 Pre-commit Checks

```bash
cd apps/api

# Linting
uv run ruff check --fix .
uv run ruff format .

# Type checking
uv run pyright
```

### 6.2 Unit Tests

```bash
cd apps/api && uv run pytest -v --cov=src/prosell
```

**Expected**: All tests pass, coverage maintained

---

## 7. Testing Strategy

### 7.1 Unit Tests
- **Existing tests**: No changes needed (base.py has no tests yet)
- **New tests**: Create `tests/unit/domain/test_base.py` in future phases

### 7.2 Integration Tests
- None for this phase (foundation only)

### 7.3 Coverage Targets
- Unit tests: >80% (maintain current)
- New code: 0% (base.py is infrastructure, no logic yet)

---

## 8. Common Pitfalls

### 8.1 Using `default=` Instead of `default_factory=`
**Problem**: `default=datetime.now(UTC)` is evaluated ONCE at module load
**Solution**: Use `default_factory=lambda: datetime.now(UTC)` for new value per instance

### 8.2 Setting `frozen=True` on DomainModel
**Problem**: Entities with methods like `user.record_failed_login()` need mutability
**Solution**: `frozen=False` for DomainModel, `frozen=True` for ValueObject/DomainEvent

### 8.3 Forgetting `from_attributes=True`
**Problem**: Phase 4 won't be able to use `model_validate(orm_model)`
**Solution**: Set `from_attributes=True` NOW in Phase 1

---

## 9. Rollback Plan

If implementation fails:
1. `git checkout apps/api/src/prosell/domain/base.py`
2. `git checkout apps/api/pyproject.toml`
3. Verify tests pass again
4. Document issue in GitHub issue

---

## 10. Completion Checklist

- [ ] DomainModel, ValueObject, DomainEvent created in base.py
- [ ] ConfigDict options are correct (frozen, validate_assignment, etc.)
- [ ] python-jose removed from pyproject.toml
- [ ] No imports of `jose` exist in codebase
- [ ] All existing tests pass (129 tests)
- [ ] Ruff passes with no errors
- [ ] Pyright passes with no errors
- [ ] Commit message follows conventional format

---

## Confidence Score

**Score**: 9/10

**Reasoning**:
- **Positive factors**:
  - Simple, well-defined scope
  - Clear Pydantic patterns to follow
  - No business logic changes
  - Excellent Pydantic documentation

- **Risk factors**:
  - From_attributes=True not tested until Phase 4
  - Removing dependency requires verification no code uses it
  - One missed import of jose could break imports

- **Why not 10/10**:
  - Can't fully verify `from_attributes=True` works until Phase 4
  - Small risk of missing jose import in less obvious files
