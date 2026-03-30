---
phase: 02-catalog-roles
plan: 01
title: "Dealer Entity with Repository and Migration"
oneLiner: "Dealer domain entity with location fields, slug generation, repository, and Alembic migration"
subsystem: "Domain Layer - Dealer Entity"
tags: ["domain", "repository", "migration", "entity"]
dependencyGraph:
  provides: ["dealer-entity"]
  requires: ["test-infrastructure"]
  affects: ["user-dealer-assignment", "dealer-crud-api"]
techStack:
  added:
    - "Dealer domain entity with factory method"
    - "DealerNotFound and SlugNotUnique exceptions"
    - "AbstractDealerRepository interface"
    - "DealerModel SQLAlchemy ORM"
    - "SqlAlchemyDealerRepository implementation"
    - "Alembic migration for dealers table"
  patterns:
    - "Factory method pattern (Dealer.create)"
    - "Slug generation from name (SEO-friendly)"
    - "Repository pattern with mapper methods"
    - "Multi-tenant unique constraints (tenant_id + slug)"
keyFiles:
  created:
    - "apps/api/src/prosell/domain/entities/dealer.py"
    - "apps/api/src/prosell/domain/exceptions/dealer_exceptions.py"
    - "apps/api/src/prosell/domain/repositories/dealer_repository.py"
    - "apps/api/src/prosell/infrastructure/models/dealer_model.py"
    - "apps/api/src/prosell/infrastructure/repositories/dealer_repository_impl.py"
    - "apps/api/alembic/versions/20260329_0825-a546709840eb_add_dealers_table.py"
    - "apps/api/tests/unit/domain/test_dealer_entity.py"
  modified:
    - "apps/api/src/prosell/domain/entities/__init__.py"
    - "apps/api/src/prosell/domain/repositories/__init__.py"
    - "apps/api/src/prosell/infrastructure/models/__init__.py"
decisions: []
metrics:
  duration: "8 minutes"
  completedDate: "2026-03-29T12:27:26Z"
  tasksCompleted: 5
  filesCreated: 7
  filesModified: 3
  commits: 2
  testsPassing: 10
---

# Phase 02 Plan 01: Dealer Entity Summary

## Overview

Implemented the Dealer (Organization) domain entity with complete production-ready fields, repository interface, SQLAlchemy ORM model, and database migration. This establishes the core entity for managing multi-tenant dealers with role-based catalog access.

**One-liner**: Dealer domain entity with location fields, slug generation, repository, and Alembic migration

## What Was Built

### Domain Layer

1. **Dealer Entity** (`dealer.py`)
   - Identity fields: `id` (UUID), `tenant_id` (UUID), `name` (str), `slug` (str)
   - Location fields (all optional): `location_address`, `location_city`, `location_state`, `location_zip`, `location_lat`, `location_lng`
   - Business fields: `timezone` (str, default "America/Montevideo"), `settings` (dict, default {})
   - Audit fields: `created_at`, `updated_at` (datetime, UTC)
   - Factory method: `Dealer.create(name, tenant_id, slug=None)` with auto-slug generation
   - Slug generation: lowercase, replace special chars with hyphens, strip leading/trailing hyphens
   - Methods: `update_basic_info()`, `update_settings()`

2. **Domain Exceptions** (`dealer_exceptions.py`)
   - `DealerNotFound`: Raised when get_by_id returns None
   - `SlugNotUnique`: Raised when slug already exists in tenant

3. **AbstractDealerRepository** (`dealer_repository.py`)
   - CRUD methods: `create()`, `get_by_id()`, `get_by_slug()`, `update()`, `delete()`
   - Query methods: `exists_by_slug()`, `list_by_tenant()`
   - All methods accept `tenant_id` for multi-tenancy

### Infrastructure Layer

1. **DealerModel** (`dealer_model.py`)
   - Table name: "dealers"
   - Mapped columns: all entity fields with proper types
   - Indexes: `ix_dealers_tenant_id`, `ix_dealers_slug`, `ix_dealers_tenant_slug` (unique composite)
   - Uses `Mapped[]` and `mapped_column()` pattern

2. **SqlAlchemyDealerRepository** (`dealer_repository_impl.py`)
   - Implements all abstract methods from `AbstractDealerRepository`
   - Mapper methods: `_to_entity()`, `_to_model()`
   - Uses `select()` pattern for queries
   - Tenant isolation enforced in all queries

3. **Alembic Migration** (`20260329_0825-add_dealers_table.py`)
   - Creates dealers table with all columns
   - Unique constraint on (tenant_id, slug)
   - Indexes for performance
   - Downgrade drops table cleanly

### Tests

- `test_dealer_entity.py`: Unit tests for Dealer entity and repository
  - Dealer.create() generates valid entity
  - Slug validation and generation
  - Timezone defaults to "America/Montevideo"
  - Repository CRUD operations
  - Mapper methods work correctly

## Key Decisions

1. **Slug generation**: Auto-generated from name but editable via parameter
2. **Unique constraint**: Composite (tenant_id, slug) for multi-tenant uniqueness
3. **Timezone default**: "America/Montevideo" for Uruguay-based operations
4. **Settings field**: JSONB for flexible configuration per dealer
5. **Location fields**: All optional to support dealers without physical location

## Commits

1. `5e014bf` - feat(phase-02-01): add Dealer domain entity and exceptions
2. `b30ba42` - feat(phase-02-01): add Dealer repository, ORM model, and migration

## Verification

- Dealer entity exists with all production fields
- Dealer.create() factory method auto-generates slug from name
- Slug uniqueness enforced at DB level
- SqlAlchemyDealerRepository implements all abstract methods
- Alembic migration creates dealers table in PostgreSQL
- All unit tests GREEN (10 tests)
- PostgreSQL dealers table verified with `\d dealers`

## Next Steps

Plan 02-02 (UserDealer M:N) can proceed - depends on Dealer entity.
