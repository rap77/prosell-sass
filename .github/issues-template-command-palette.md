# Implement CommandPalette and Year Range Slider in catalog UI

## Overview

Implement missing catalog UI features that are currently skipped in E2E tests.

## Features to Implement

### 1. CommandPalette Component

- **Priority**: High
- **Description**: Global command palette (Cmd+K / Ctrl+K) for quick vehicle search
- **Tech Stack**: cmdk + Radix Dialog
- **Requirements**:
  - Keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
  - Search input with placeholder "Search vehicles"
  - Display vehicle search results as options
  - Navigate to vehicle detail on option click
  - Accessible (role="dialog")

### 2. Catalog Search Input

- **Priority**: High
- **Description**: Search input in catalog page connected to URL query params
- **Requirements**:
  - Search input in catalog content area (not sidebar)
  - Update URL `?search=<query>` on input
  - Filter vehicles by search text (make, model, VIN)

### 3. Year Range Slider

- **Priority**: Medium
- **Description**: Dual-thumb slider for filtering vehicles by year range
- **Requirements**:
  - Min and max year thumbs
  - Update URL `?minYear=<year>&maxYear=<year>` on change
  - Display current year range

## E2E Tests Affected

The following tests are currently skipped and will pass after implementation:

- `should open CommandPalette with keyboard shortcut`
- `should search vehicles via CommandPalette`
- `should navigate to vehicle from CommandPalette`
- `should use catalog search input`
- `should filter by year range`

## Acceptance Criteria

- [ ] CommandPalette opens on `Cmd+K` / `Ctrl+K`
- [ ] CommandPalette displays vehicle search results
- [ ] Catalog search input updates URL query params
- [ ] Year range slider filters vehicles correctly
- [ ] All 7 skipped E2E tests pass
- [ ] Component is accessible (a11y)

## Technical Notes

- Use existing `/api/v1/vehicles` endpoint with `search` parameter
- Reuse existing filter components from FilterSidebar
- Follow Clean Architecture patterns (component → use case → API)

## Related Files

- `tests/e2e/specs/catalog-search-filters.spec.ts` (skipped tests)
- `apps/web/src/components/catalog/` (new components)

## TODOs in Test Files

The following test files have been updated with TODO comments referencing this issue:

- `tests/e2e/specs/catalog-search-filters.spec.ts` (lines 121, 161, 193, 229, 270, 279, 408)
