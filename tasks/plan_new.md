# ProSell MVP Implementation Plan

**Milestone**: Completar MVP de ProSell: publicación de vehículos en Facebook Marketplace, captura de leads y confirmación de citas
**Version**: 1.0
**Status**: Active
**Last Updated**: 2026-04-26

---

## Overview

This plan implements the ProSell MVP by completing **Phase 13** (C3 frontend integration) and implementing **Phase 4** (Leads & Appointments). The milestone delivers a complete sales cycle: vendedores can publish vehicles to Facebook, capture leads from messages, and schedule buyer appointments with dealers.

**Phase Status**:
- ✅ Phase 1: Hybrid Publisher (COMPLETE)
- ✅ Phase 2: Catalog & Roles (COMPLETE)
- ✅ Phase 8: Layout Shell (COMPLETE)
- ✅ Phase 11: C3 Schema Migration (COMPLETE)
- ✅ Phase 12: Backend API (COMPLETE)
- 🚧 Phase 13: Frontend C3 Integration (IN PROGRESS — 6 plans)
- 📋 Phase 4: Leads & Appointments (NEW — this plan)

---

## Phase 13: Frontend C3 Integration

**Goal**: Update frontend components to use the new C3 schema (categories+products+vehicles)

---

### 13-01: VehicleForm Refactor for C3 API

**Depends on**: Nothing
**Full plan**: `.planning/phases/13-frontend/13-01-PLAN.md`

**Objective**: Create API client infrastructure for categories and products with the new C3 schema.

**Acceptance Criteria**:
- [x] Category API client fetches from `/api/v1/categories` with 5-minute cache
- [x] Product API client creates products via `POST /api/v1/products` with vehicle auto-creation
- [x] TypeScript types match backend DTOs (CategoryResponse, ProductResponse)
- [x] Error handling works correctly with toast notifications
- [x] Both API clients have unit tests passing

---

### 13-02: DataGrid Integration with Vehicles API

**Depends on**: 13-01
**Full plan**: `.planning/phases/13-frontend/13-04-PLAN.md`

**Objective**: Update DataGrid to use the new C3 schema vehicles endpoint with product join data and cursor-based infinite scroll.

**Acceptance Criteria**:
- [x] DataGrid loads vehicles from GET /api/v1/vehicles with C3 join data
- [x] Vehicle titles display from product.title (not constructed)
- [x] Prices display correctly from product.price_cents
- [x] Status badges show product.status
- [x] Infinite scroll loads more rows on scroll (cursor pagination)
- [x] Row virtualization maintains ~40 rows in DOM (60fps performance)
- [x] Component tests pass
- [ ] E2E infinite scroll test passes

---

### 13-03: Category Dropdown and Attribute Rendering

**Depends on**: 13-01
**Full plan**: `.planning/phases/13-frontend/13-02-PLAN.md`

// ... 855 more lines (total: 925)
