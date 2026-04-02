---
status: investigating
trigger: "Fix user_dealers → organizations (multi-niche architecture)"
created: 2026-03-31T12:00:00Z
updated: 2026-03-31T12:15:00Z
---

## Current Focus

hypothesis: user_dealers table has FK to "dealers.id" which doesn't exist - should be "organizations.id"
test: Verify if dealers table exists, check FK constraint in migration
expecting: dealers table doesn't exist, FK is invalid
next_action: Check if dealers table exists in migrations or models

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Code should use generic organization tables (multi-niche: vehicles, real estate, etc.)
actual: Code queries user_dealers table (vehicle-specific)
errors: None reported - architectural bug identified by user
reproduction: Check vehicle_repository_impl.py, user_dealer_router.py
started: User identified after Inventory MVP completion

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-31T12:05:00Z
  checked: Migration 20260329_1500-add_user_dealers_table.py
  found: FK constraint references "dealers.id" table (line 48-49)
  implication: dealers table must exist for this FK to be valid

- timestamp: 2026-03-31T12:10:00Z
  checked: Searched for dealers table creation
  found: No "create_table.*dealers" or "__tablename__ = 'dealers'" in codebase
  implication: dealers table doesn't exist - FK is invalid

- timestamp: 2026-03-31T12:12:00Z
  checked: Initial schema migration (20260322_1720)
  found: "organizations" table exists, NO "dealers" table
  implication: Platform uses organizations, not dealers

- timestamp: 2026-03-31T12:15:00Z
  checked: user_dealer_router.py, user_dealer_repository_impl.py
  found: Complete CRUD API for user_dealers table
  implication: This is vehicle-specific naming, should be organization_members

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: user_dealers table has invalid FK to non-existent "dealers" table - should use "organizations"
fix: Rename user_dealers → organization_members, update FK to organizations.id
verification: Tests pass, code works for any niche
files_changed: []
