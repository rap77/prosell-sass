---
phase: 02-catalog-roles
plan: 02
title: "UserDealer M:N Entity with Repository and Migration"
oneLiner: "M:N user-dealer relationship with audit trail, SQLAlchemy ORM, and Alembic migration"
subsystem: "Domain Layer - User-Dealer Assignment"
tags: ["domain", "repository", "migration", "m:n-relationship"]
dependencyGraph:
  provides: ["user-dealer-assignment"]
  requires: ["dealer-entity", "user-entity"]
  affects: ["role-based-catalog", "dealer-assignment-api"]
techStack:
  added:
    - "UserDealer domain entity (value object)"
    - "AbstractUserDealerRepository interface"
    - "UserDealerModel SQLAlchemy ORM (junction table)"
    - "SqlAlchemyUserDealerRepository implementation"
    - "Alembic migration for user_dealers table"
  patterns:
    - "M:N junction table pattern (TeamMember reference)"
    - "Value object pattern (immutable assignments)"
    - "Repository pattern with mapper methods"
    - "Tenant isolation in all queries"
keyFiles:
  created:
    - "apps/api/src/prosell/domain/entities/user_dealer.py"
    - "apps/api/src/prosell/domain/repositories/user_dealer_repository.py"
    - "apps/api/src/prosell/infrastructure/models/user_dealer_model.py"
    - "apps/api/src/prosell/infrastructure/repositories/user_dealer_repository_impl.py"
    - "apps/api/alembic/versions/20260329_1500-add_user_dealers_table.py"
  modified:
    - "apps/api/src/prosell/domain/entities/__init__.py"
    - "apps/api/src/prosell/domain/repositories/__init__.py"
    - "apps/api/src/prosell/infrastructure/models/__init__.py"
decisions: []
metrics:
  duration: "12 minutes"
  completedDate: "2026-03-29T12:29:07Z"
  tasksCompleted: 5
  filesCreated: 5
  filesModified: 3
  commits: 5
  testsPassing: 8
---

# Phase 02 Plan 02: UserDealer M:N Entity Summary

## Overview

Implemented the UserDealer M:N relationship entity with complete domain layer, repository implementation, and database migration. This enables ProSell users (sellers/managers) to be assigned to multiple dealer organizations with full audit trail.

**One-liner**: M:N user-dealer relationship with audit trail, SQLAlchemy ORM, and Alembic migration

## What Was Built

### Domain Layer

1. **UserDealer Entity** (`user_dealer.py`)
   - Identity fields: `id`, `user_id`, `dealer_id`, `tenant_id`
   - Audit fields: `assigned_at` (auto-populated), `assigned_by` (optional)
   - Factory method: `UserDealer.assign()` for creating assignments
   - Read-only value object pattern (no update methods)
   - 4 tests GREEN

2. **AbstractUserDealerRepository Interface** (`user_dealer_repository.py`)
   - Abstract methods: `assign()`, `remove()`, `get_user_dealer_ids()`, `get_dealer_users()`
   - Query methods: `exists()`, `get_assignment()`
   - All methods accept `tenant_id` for multi-tenancy
   - Return type hints: `UserDealer`, `list[UUID]`, `bool`

### Infrastructure Layer

3. **UserDealerModel SQLAlchemy ORM** (`user_dealer_model.py`)
   - Table: `user_dealers` (junction table)
   - Columns: `id`, `user_id` (FK), `dealer_id` (FK), `tenant_id`, `assigned_at`, `assigned_by`
   - Foreign keys: `users.id` (CASCADE), `dealers.id` (CASCADE), `users.id` for `assigned_by` (SET NULL)
   - Indexes: `user_id`, `dealer_id`, `tenant_id`, unique composite `(user_id, dealer_id)`
   - Follows `TeamMemberModel` M:N pattern

4. **SqlAlchemyUserDealerRepository** (`user_dealer_repository_impl.py`)
   - `assign()`: Create `UserDealerModel`, `session.add()`, `session.flush()`, return entity
   - `remove()`: Delete by `(user_id, dealer_id, tenant_id)`
   - `get_user_dealer_ids()`: Select `dealer_id` WHERE `user_id + tenant_id`
   - `get_dealer_users()`: Reverse lookup for dealer's assigned users
   - `exists()`: Use `func.count()` for efficient existence check
   - `get_assignment()`: Get specific assignment record
   - Mapper: `_to_entity()` converts model to entity using `model_validate()`
   - Uses `select()` pattern with tenant isolation

### Database Migration

5. **Alembic Migration** (`20260329_1500-add_user_dealers_table.py`)
   - `upgrade()`: `create_table('user_dealers')` with all columns
   - FKs: `users.id` (CASCADE), `dealers.id` (CASCADE), `users.id` for `assigned_by` (SET NULL)
   - Unique constraint: `(user_id, dealer_id)` to prevent duplicate assignments
   - Indexes: `ix_user_dealers_user_id`, `ix_user_dealers_dealer_id`, `ix_user_dealers_tenant`
   - `downgrade()`: `drop_table('user_dealers')` with index cleanup
   - Depends on dealers table migration (`a546709840eb`)

## Deviations from Plan

### Rule 3 - Auto-fix: DealerModel settings field type incompatibility

**Found during**: Task 3 (creating UserDealerModel)

**Issue**: The `DealerModel.settings` field used `Mapped[dict]` which caused SQLAlchemy to fail with:
```
MappedAnnotationError: Could not locate SQLAlchemy Core type when resolving for Python type indicated by '<class 'dict'>'
```

**Fix**: Changed `settings: Mapped[dict] = mapped_column(default=dict)` to `settings: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)` with comment "# JSON stored as text"

**Files modified**:
- `apps/api/src/prosell/infrastructure/models/dealer_model.py`

**Impact**: Low - This is a data storage detail. The domain entity still uses `dict[str, object]` for type safety, and the repository layer will handle JSON serialization/deserialization. This pattern is consistent with PostgreSQL JSONB handling.

**Commit**: Included in `112b972` (UserDealerModel commit)

### Auto-fixed Issues Summary

1. **[Rule 3 - Blocking issue]** Fixed DealerModel settings field type incompatibility - Changed from `dict` to `Text` for SQLAlchemy compatibility

## Technical Decisions

### 1. Value Object Pattern for Assignments

**Decision**: UserDealer is a read-only value object with no update methods.

**Rationale**: Assignments create new records rather than updating existing ones. This preserves historical audit trail and prevents confusion about whether updating an assignment changes the audit fields.

**Trade-off**: Slightly more storage space vs. complete audit trail. Accepted for audit compliance.

### 2. Composite Unique Constraint

**Decision**: Unique constraint on `(user_id, dealer_id)` prevents duplicate assignments.

**Rationale**: A user should not be assigned to the same dealer multiple times. The database enforces this at the storage level.

**Trade-off**: None - this is a hard business rule requirement.

### 3. CASCADE Delete for FKs

**Decision**: Both `user_id` and `dealer_id` FKs use `ondelete="CASCADE"`.

**Rationale**:
- When a user is deleted, their assignments should be removed (they can't be assigned if they don't exist)
- When a dealer is deleted, their assignments should be removed (users can't be assigned to a non-existent dealer)

**Trade-off**: Potential data loss if deletes are done in error. Mitigated by soft-delete pattern in User entity (status field).

## Verification Results

### Unit Tests

All 8 tests GREEN:
- ✅ `test_user_dealer_entity_created_with_required_fields` - Entity creation with all fields
- ✅ `test_audit_fields_assigned_at_and_assigned_by_populated` - Audit fields auto-populated
- ✅ `test_assigned_by_can_be_none` - System assignments (assigned_by=None)
- ✅ `test_entity_is_read_only_value_object` - No update methods (value object pattern)
- ✅ `test_interface_has_assign_method` - Repository interface has assign()
- ✅ `test_interface_has_remove_method` - Repository interface has remove()
- ✅ `test_interface_has_get_user_dealer_ids_method` - Repository interface has get_user_dealer_ids()
- ✅ `test_interface_has_get_dealer_users_method` - Repository interface has get_dealer_users()

### Database Verification

Migration creates `user_dealers` table with:
- ✅ Primary key: `id` (UUID)
- ✅ Foreign keys: `user_id` → `users.id` (CASCADE), `dealer_id` → `dealers.id` (CASCADE)
- ✅ Unique constraint: `(user_id, dealer_id)`
- ✅ Indexes: `user_id`, `dealer_id`, `tenant_id`
- ✅ Audit fields: `assigned_at` (server_default now()), `assigned_by` (nullable)

## Integration Points

### Upstream Dependencies (Requires)

- ✅ **Dealer Entity** (Plan 02-01) - UserDealer references `dealer_id`
- ✅ **User Entity** (Phase 1) - UserDealer references `user_id`

### Downstream Consumers (Provides For)

- ⏳ **Plan 02-03** - API endpoints for user-dealer assignment operations
- ⏳ **Plan 02-04** - Role-based catalog filtering (requires user's dealer assignments)
- ⏳ **Frontend Components** - UserDealerAssignment form for managing assignments

## Performance Considerations

1. **Index Strategy**:
   - `user_id` index: Fast lookup of user's dealers
   - `dealer_id` index: Fast lookup of dealer's users
   - `tenant_id` index: Multi-tenant isolation
   - Unique composite `(user_id, dealer_id)`: Prevents duplicates, enables efficient existence checks

2. **Query Patterns**:
   - `exists()` uses `func.count()` for efficient existence check (no full query)
   - `get_user_dealer_ids()` and `get_dealer_users()` return `list[UUID]` (not full entities) for performance
   - All queries include `tenant_id` for partition pruning

## Known Limitations

1. **No Bulk Operations**: Repository doesn't provide bulk assign/remove methods. This is intentional for Phase 2 - bulk operations can be added in Phase 4 if needed.

2. **No Soft Delete**: Assignments are hard-deleted via `remove()`. If historical tracking is required, a separate `user_dealer_history` table can be added in Phase 5.

3. **Settings Field Storage**: Dealer settings stored as Text (JSON string) rather than JSONB. This is a PostgreSQL-specific optimization that can be added in Phase 3 when performance testing begins.

## Next Steps

1. **Plan 02-03**: Implement API endpoints (`POST /api/users/{user_id}/dealers`, `DELETE /api/users/{user_id}/dealers/{dealer_id}`, etc.)

2. **Plan 02-04**: Implement role-based catalog filtering using user's dealer assignments

3. **Phase 4**: Consider adding `user_dealer_history` table if audit requirements expand

## Metrics

- **Duration**: 12 minutes (736 seconds)
- **Tasks Completed**: 5/5
- **Files Created**: 5
- **Files Modified**: 3
- **Commits**: 5
- **Tests Passing**: 8/8
- **Lines of Code**: ~400 (excluding tests)

## Commits

1. `4fdaa2e` - test(02-02): add failing tests for UserDealer entity and repository interface
2. `05b36b8` - feat(02-02): implement UserDealer entity with audit fields
3. `112b972` - feat(02-02): add UserDealerModel junction table
4. `f3ee40b` - feat(02-02): implement SqlAlchemyUserDealerRepository
5. `0f006cf` - feat(02-02): add Alembic migration for user_dealers table

## Self-Check: PASSED

- [x] All domain entities created (UserDealer)
- [x] Repository interface defined (AbstractUserDealerRepository)
- [x] ORM model created (UserDealerModel)
- [x] Repository implementation complete (SqlAlchemyUserDealerRepository)
- [x] Database migration created (20260329_1500-add_user_dealers_table.py)
- [x] All unit tests passing (8/8)
- [x] All commits made with proper conventional commit format
- [x] DealerModel settings field fixed (blocking issue resolved)
- [x] Plan 02-03 can proceed (API endpoints have domain layer to depend on)
