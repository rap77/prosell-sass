---
name: database-migration-uuid-issue-2026-03-22
description: Migraciones Alembic tienen orden incorrecto - UUID después de organizations
type: project
---

# Database Migration Issue - UUID Type Mismatch

## Problem

When running `alembic upgrade head`, migration fails with:

```
foreign key "organizations_verified_by_fkey" cannot be implemented
Key columns "verified_by" and "id" are of incompatible types: uuid and character varying
```

## Root Cause

**Migration order is incorrect**:

1. **Initial schema** (`d1823b89fecb`): Creates `users.id` as VARCHAR
2. **Organizations** (`2a3b4c5d6e7f`): Creates `organizations.verified_by` as UUID → `users.id` (**FAILS**)
3. **UUID conversion** (`20260301_0000`): Converts `users.id` to UUID (**TOO LATE**)

## Current Migration Order

```
d1823b89fecb → Initial schema (users.id = VARCHAR)
     ↓
2a3b4c5d6e7f → Organizations (verified_by = UUID → users.id) ❌ FAILS
     ↓
20260301_0000 → Convert to UUID (users.id = UUID) ⚠️ TOO LATE
```

## Required Migration Order

```
[Initial schema] → users.id = UUID from start
      ↓
[Organizations] → verified_by = UUID → users.id ✅ WORKS
```

## Solution

**Create fresh consolidated migration** with:
- All tables using UUID from the start
- Single migration file for entire schema
- Correct foreign key relationships

## Tables Affected

- `users` - id must be UUID PRIMARY KEY
- `oauth_accounts` - user_id UUID FK
- `sessions` - user_id UUID FK
- `organizations` - verified_by UUID FK, id UUID PK
- `teams`, `wallets`, `categories`, `products`, `vehicles`, `publications`
- `facebook_accounts`, `facebook_pages`

## Database State

- Database `prosell_dev` is EMPTY (0 tables)
- Previous migrations never applied or database recreated
- Ready for fresh migration

## Files to Create

```
apps/api/alembic/versions/[timestamp]_initial_uuid_schema.py
```

Consolidate all existing migrations into one fresh file with correct types.

## Session Context

Session: 2026-03-22
Discovered during: OAuth fix attempt to apply migrations
Impact: Blocks OAuth testing - oauth_accounts table doesn't exist
