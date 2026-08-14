# Product Actions UX Improvements

**Status**: IMPLEMENTED (Phase 1, merged 2026-08-13)
**Created**: 2026-08-13
**Owner**: Engineering Team
**Priority**: High (Phase 1), Medium (Phase 2)

---

## Executive Summary

Improve product catalog actions UX by converting large buttons to space-efficient icons and enabling batch operations for common workflows. Two-phase approach: incremental improvements (Phase 1) followed by advanced features (Phase 2).

**Phase 1 Impact**: 80% space savings in mobile + batch review submission
**Phase 2 Potential**: 90% time savings on repetitive operations + advanced table features

---

## Context & Problem

### Current Pain Points

1. **Space inefficiency**: "Enviar a revisión" button occupies significant space in ProductCard (especially mobile)
2. **No batch operations**: Users must submit products for review individually (10 products = 10 clicks)
3. **Table UX**: DataGrid has basic functionality but lacks advanced features like batch actions, export, inline edit

### User Request

> "El botón ocupa mucho espacio. Colocalo en el grupo de iconos de acciones y agregale un tooltip. Buscar forma de agregar varios en lote. Revisar vista tabla para mejorar UX/UI."

---

## Phase 1: Incremental Improvements ⭐ IN PROGRESS

**Goal**: Fix immediate pain points (space + batch submit)
**Effort**: 3-4 hours
**ROI**: High

### 1.1 ProductCard - Icon with Tooltip

**Current state**:

```tsx
<Button size="touch" className="w-full">
  <Send /> Enviar a revisión
</Button>
```

**New state**:

```tsx
<IconButton
  icon={<Send />}
  tooltip="Enviar a revisión"
  onClick={onSubmitForReview}
/>
```

**Benefits**:

- 80% space savings in mobile view
- Consistent with other actions (Edit, Delete)
- Better visual hierarchy

### 1.2 DataGrid - Batch Submit

**Backend**:

- Create `BatchSubmitProductsUseCase` (model: `BatchApproveProductsUseCase`)
- Endpoint: `POST /api/v1/products/batch/submit`
- Request: `{"product_ids": ["id1", "id2", ...]}`
- Response: `{"success_count": 8, "failed": [{id, reason}]}`

**Frontend**:

- Hook: `useSubmitProductsForApproval(ids: string[])`
- DataGrid bulk toolbar: "Enviar a revisión" button
- Smart filtering: only show when draft/rejected products selected

**Files to modify**:

- `apps/web/src/components/catalog/ProductCard.tsx`
- `apps/web/src/components/datagrid/DataGrid.tsx`
- `apps/web/src/lib/api/products.ts` (add batch hook)
- `apps/api/src/prosell/application/use_cases/product/batch_submit_products.py` (new)
- `apps/api/src/prosell/application/dto/product/batch_submit.py` (new)
- `apps/api/src/prosell/infrastructure/api/routers/product_router.py` (new endpoint)
- `apps/api/tests/integration/use_cases/test_batch_submit_products.py` (new)

### 1.3 Table UX Polish

**Quick wins**:

- More compact status badges in table cells
- Clearer hover states (existing but subtle)
- Better row clickable indicator (cursor + focus ring)

---

## Phase 2: Advanced Improvements 🚀 BACKLOG

**Goal**: Transform table into power-user tool
**Effort**: 16 days total (6 days recommended cherry-pick)
**ROI**: Very High (for cherry-picked items)

### High ROI Items (6 days - RECOMMENDED)

#### 2.1 Batch Actions Unificado (3 days) ⭐⭐⭐

**What**: All `AvailabilityActions` available in batch mode from DataGrid

**Actions to support**:

- Submit for review (draft/rejected → pending)
- Reserve (published → reserved)
- Pause (published → paused)
- Resume (reserved/paused → published)
- Mark sold (published/reserved → sold)

**Implementation**:

- Backend: `BatchReserveProductsUseCase`, `BatchPauseProductsUseCase`, etc.
- Frontend: Dynamic bulk toolbar based on selected products' statuses
- Hooks: `useReserveProducts()`, `usePauseProducts()`, etc.

**Use cases**:

- End of month: mark 10 sold cars in 1 click
- Event: pause 20 cars going to exhibition
- Cleanup: reserve batch of cars with mechanical issues

**Value**: 90% time savings on repetitive operations

#### 2.4 Smart Contextual Actions (2 days) ⭐⭐⭐

**What**: Bulk toolbar shows ONLY valid actions for current selection

**Logic**:

```typescript
// User selects: 3 draft + 2 published
Bulk toolbar shows:
  ✅ "Enviar a revisión" (applies to 3 draft)
  ✅ "Pausar" (applies to 2 published)
  ❌ "Marcar vendido" (no draft can be sold)

// User selects: 5 published
Bulk toolbar shows:
  ✅ "Pausar"
  ✅ "Apartar"
  ✅ "Marcar vendido"
  ❌ "Enviar a revisión" (already published)
```

**Implementation**:

- Map each action → valid statuses (`LEGAL_ACTIONS` from `AvailabilityActions.tsx`)
- Filter selected rows by status
- Show action button + badge with applicable count
- Example: `Pausar (2 publicados)` when 3 draft + 2 published selected

**Benefits**:

- Prevents errors (can't submit published products)
- Clearer UX (no disabled buttons)
- Smart batching (partial operations)

#### 2.6 Export to CSV (1 day) ⭐⭐

**What**: Export selected rows or all filtered results to CSV

**Features**:

- Button in bulk toolbar: "Exportar selección" (when rows selected)
- Button in main header: "Exportar filtrados" (exports current filter/search results)
- Configurable columns (use visible columns from table)

**Use cases**:

- Monthly sales report: filter "sold last 30 days" → export CSV → Excel
- Inventory audit: filter by branch → export
- Price analysis: filter by make/model → export

**Implementation**:

- Client-side CSV generation (no backend endpoint needed)
- Library: `papaparse` or native string concatenation
- Respect current column visibility settings

**Value**: Ad-hoc reports without custom backend endpoints

---

### Medium ROI Items (10 days)

#### 2.7 Bulk Edit Inline (4 days) ⭐⭐⭐

**What**: Edit common field for multiple products without opening each one

**Supported fields**:

- Price adjustment (% or fixed amount)
- Branch assignment (already exists, enhance UI)
- Category change
- Status notes

**UI Flow**:

```
1. Select 10 products
2. Bulk toolbar → "Editar campo" dropdown
3. Choose "Precio"
4. Modal: "Ajustar precio en: [-10%] [Aplicar]"
5. Preview: 10 productos × -10% = $X total discount
6. Confirm → Batch update
```

**Use cases**:

- Seasonal discounts: -15% on 50 cars
- Inflation adjustment: +8% on all inventory
- Event pricing: special prices for 20 cars

**Implementation**:

- Backend: `BatchUpdateProductsUseCase` with field-specific validators
- Frontend: Field picker + value input + preview
- Optimistic updates with rollback on error

#### 2.2 Column Filters (3 days) ⭐⭐

**What**: Click column header → filter dropdown (Excel-like)

**Filter types by column**:

- Text (title): search input
- Number (price): range slider or min/max inputs
- Enum (status): checkbox list
- Branch: dropdown with search

**Implementation**:

- TanStack Table has built-in column filtering
- Add filter UI in column headers
- Combine with existing sidebar filters (union logic)

**Value**: Fast analysis without leaving table view

#### 2.8 Row Actions Menu Enhancement (1 day) ⭐⭐

**What**: Add all `AvailabilityActions` to table `ActionMenu`

**Current**: Edit, Delete, Publish
**New**: Edit, Delete, Submit, Reserve, Pause, Resume, Sold (context-aware)

**Implementation**:

- Reuse `LEGAL_ACTIONS` logic from `AvailabilityActions.tsx`
- Show only valid actions per row status
- Consistent icons + labels

**Value**: Parity between table view and detail view

#### 2.3 Sorting Visual Improvements (1 day) ⭐

**What**: Better visual feedback for table sorting

**Features**:

- Clear sort indicators (↑ ascending, ↓ descending)
- Multi-column sort (Shift+click)
- Persist sort in URL query params

**Implementation**:

- TanStack Table already supports sorting (enabled in code)
- Add visual indicators in column headers
- URL sync for bookmarkable sorted views

#### 2.5 Column Visibility Toggle (1 day) ⭐

**What**: Show/hide columns based on user preference

**UI**:

- Button in header: "Columnas" → checklist modal
- Presets: "Compacta" (mobile), "Completa" (desktop), "Custom"

**Use cases**:

- Mobile: hide Year/Make/Model for narrower table
- Desktop: show all columns
- Custom: user defines their preferred view

**Implementation**:

- TanStack Table has built-in column visibility
- Add UI controls + localStorage persistence

---

## Implementation Plan

### Phase 1 (Current Sprint) ✅ COMPLETED

**Week 1**:

- [x] Backend: `BatchSubmitProductsUseCase` + tests
- [x] Backend: `POST /api/v1/products/batch/submit` endpoint
- [x] Frontend: `useSubmitProductsForApproval` hook
- [x] Frontend: DataGrid bulk toolbar batch submit button
- [x] Frontend: ProductCard icon with tooltip
- [x] E2E test: Batch submit workflow (tests/e2e/layer2/products-contract.spec.ts P-26 to P-29)

**Acceptance Criteria**:

- ✅ ProductCard shows Send icon with tooltip instead of large button
- ✅ DataGrid bulk toolbar shows "Enviar a revisión" when draft/rejected selected
- ✅ Batch submit endpoint processes 10+ products in <2s
- ✅ Errors handled gracefully (partial success reporting)
- ✅ Mobile responsive (icon visible, tooltip accessible)

### Phase 2 (Future Sprints)

**Sprint 1 (6 days)**: High ROI cherry-pick

- Batch actions unificado (#2.1)
- Smart contextual actions (#2.4)
- Export to CSV (#2.6)

**Sprint 2 (10 days)**: Remaining features (if needed)

- Bulk edit inline (#2.7)
- Column filters (#2.2)
- Row actions enhancement (#2.8)
- Sorting visual (#2.3)
- Column visibility (#2.5)

---

## Success Metrics

### Phase 1

- **Space savings**: 80% reduction in ProductCard action area (mobile)
- **Time savings**: 90% reduction for batch submit (10 products: 10 clicks → 1 click)
- **Adoption**: 30%+ of review submissions via batch mode within 2 weeks

### Phase 2

- **Time savings**: 90% reduction on all bulk operations
- **Export usage**: 50+ CSV exports per week
- **Bulk edit adoption**: 20%+ of price changes via bulk edit

---

## Risks & Mitigations

### Phase 1

- **Risk**: Icon-only button less discoverable than text button
  - **Mitigation**: Tooltip + context (only shown for draft/rejected, clear intent)

- **Risk**: Batch submit errors difficult to debug
  - **Mitigation**: Detailed error response per product, UI shows which failed + why

### Phase 2

- **Risk**: Feature creep (too many buttons in bulk toolbar)
  - **Mitigation**: Smart contextual actions (#2.4) - show only valid actions

- **Risk**: Bulk edit mistakes (wrong value applied to many products)
  - **Mitigation**: Preview before confirm, undo capability, audit log

---

## Technical Notes

### Existing Patterns to Reuse

**Batch operations** (from `BatchApproveProductsUseCase`):

```python
# Backend pattern
class BatchSubmitProductsUseCase:
    async def execute(self, product_ids: list[str], tenant_id: str) -> BatchSubmitResponse:
        results = []
        for product_id in product_ids:
            try:
                # Reuse existing single submit logic
                await self._submit_repo.submit_product(product_id, tenant_id)
                results.append({"id": product_id, "success": True})
            except Exception as e:
                results.append({"id": product_id, "success": False, "error": str(e)})
        return BatchSubmitResponse(results=results)
```

**Frontend hooks** (from `useMarkProductSold`, `useReserveProduct`):

```typescript
// Frontend pattern - extend to batch
export function useSubmitProductsForApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productIds: string[]) => {
      const res = await apiClient.post("/products/batch/submit", {
        product_ids: productIds,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Productos enviados a revisión");
    },
  });
}
```

### Architecture Decisions

**Why icon-only button**:

- Space efficiency (especially mobile)
- Consistency with Edit/Delete actions
- Modern UI pattern (Gmail, GitHub, etc.)

**Why batch operations on backend**:

- Transaction safety (all-or-nothing for DB updates)
- Better error handling (per-item error reporting)
- Audit trail (single batch operation log vs N individual logs)

**Why smart contextual actions**:

- Prevents errors (can't submit already-published products)
- Cleaner UX (no disabled buttons cluttering toolbar)
- Progressive disclosure (show only what's relevant)

---

## References

- **Existing code**:
  - `apps/web/src/components/catalog/AvailabilityActions.tsx` (action definitions + validation)
  - `apps/web/src/components/datagrid/DataGrid.tsx` (bulk selection + toolbar)
  - `apps/api/src/prosell/application/use_cases/product/batch_approve_products.py` (batch pattern)

- **Similar features**:
  - Gmail bulk actions (contextual toolbar)
  - GitHub issue bulk edit (inline field editing)
  - Excel column filters (dropdown per column)

---

## Changelog

- **2026-08-13**: Spec created, Phase 1 approved and started
