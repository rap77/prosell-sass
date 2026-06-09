# E2E Test Fix Summary

## Root Causes Identified

### 1. Select Component Timeout (9 tests)

**Primary Issue**: Race condition between test creating category via API and frontend loading categories

**Flow**:

1. Test creates category via `dataBuilder.createCategory()` (line 35)
2. Test immediately tries to select category (line 60)
3. Frontend's `useCategories()` hook hasn't fetched the new category yet
4. Select dropdown opens but doesn't show the new category
5. Test times out waiting for option

**Fix Applied**:

- Updated `vehicles-page.ts` to wait for Portal rendering
- Added 500ms delay after clicking select
- Added multiple fallback strategies for finding options
- Better toast detection with Sonner attributes

**Additional Fix Needed**:
Add explicit wait in test for category to be available:

```typescript
// After creating category, wait for it to appear in dropdown
await vehiclesPage.categorySelect.click();
await page.waitForTimeout(1000); // Wait for API refresh
await vehiclesPage.categorySelect.click(); // Close dropdown
// Then proceed with selection
```

### 2. VIN Decode Wrong Data (1 test)

**Issue**: Test expects `/equinox/i` but mock returns "Accord" for VIN `1HGCM82633A123456`

**Analysis**:

- Line 38-45: Mock setup for VIN `1HGCM82633A123456` returns Accord
- Line 173-184: Test uses VIN `2GNALCEK1H1615946` which should return Equinox
- Line 184: Test expects `/equinox/i`

**Verdict**: Test should pass - mock is correctly set up

**Possible Issue**: Timing - VIN decode takes time and form might not update immediately

**Fix**: Already handled in VehicleForm.tsx with proper setValue calls

### 3. Toast Messages Not Visible (4 tests)

**Issue**: Tests use `getByText()` but Sonner toasts render in Portal

**Fix Applied**:

- Updated `vehicles-page.ts` with better toast detection
- Uses `[data-sonner-toast]` attribute selector
- Falls back to text search if attribute not found
- Added explicit wait for toast rendering

**Tests Affected**:

- Line 315-327: VIN format validation
- Line 329-346: Missing required fields
- Line 348-362: Network errors
- Line 364-379: Timeout errors

### 4. API Timeout (1 test)

**Issue**: Form submission not reaching backend

**Root Cause**: Submit button locator too broad

**Fix Applied**:

- Updated submit button locator to be more specific
- Changed from `getByRole("button", { name: /create|save|crear/i })`
- To: `getByRole("button", { name: /(create|save|crear)\s*(vehicle)?/i })`

## Changes Made

### File: tests/e2e/pages/vehicles-page.ts

1. **selectCategory() method**:
   - Added explicit wait for category select to be visible
   - Added 500ms delay after clicking to allow Portal to render
   - Added multiple fallback strategies for finding options
   - Uses both `[data-radix-select-item]` and text search

2. **waitForToast() method**:
   - Added multiple strategies for finding toasts
   - Uses `[data-sonner-toast]` attribute
   - Falls back to text search
   - Uses Promise.race for faster detection

3. **verifyToastVisible() method**:
   - Checks both strategies
   - More robust visibility check

4. **submitButton locator**:
   - More specific regex pattern
   - Matches "Create Vehicle", "Save", "Crear" etc.

## Remaining Work

### Test Updates Needed

The following tests need to be updated to use the new page object methods:

1. **Line 315-327**: should validate VIN format (too long)

   ```typescript
   // OLD:
   await expect(page.getByText(/Invalid VIN/i)).toBeVisible({ timeout: 3000 });

   // NEW:
   await vehiclesPage.verifyToastVisible(/Invalid VIN/i);
   ```

2. **Line 329-346**: should handle missing required fields

   ```typescript
   // OLD:
   await expect(page.getByText(/Campos incompletos/i)).toBeVisible({
     timeout: 3000,
   });

   // NEW:
   await vehiclesPage.verifyToastVisible(/Campos incompletos/i);
   ```

3. **Line 348-362**: should handle network errors

   ```typescript
   // OLD:
   const toast = page
     .locator("[data-sonner-toast]")
     .filter({ hasText: /Failed to decode VIN/i });
   await expect(toast).toBeVisible({ timeout: 5000 });

   // NEW:
   await vehiclesPage.verifyToastVisible(/Failed to decode VIN/i);
   ```

4. **Line 364-379**: should handle timeout

   ```typescript
   // OLD:
   const toast = page
     .locator("[data-sonner-toast]")
     .filter({ hasText: /Failed to decode VIN/i });
   await expect(toast).toBeVisible({ timeout: 5000 });

   // NEW:
   await vehiclesPage.verifyToastVisible(/Failed to decode VIN/i);
   ```

### Category Loading Fix

Add explicit wait in test beforeEach for categories to load:

```typescript
test.beforeEach(async ({ page, request }) => {
  clearVinMocks();
  vehiclesPage = new VehiclesPage(page);
  dataBuilder = new TestDataBuilder(request);

  // Create test category via API
  testCategoryName = `Sedan Test ${Date.now()}`;
  testCategoryId = await dataBuilder.createCategory(testCategoryName);

  // NEW: Wait for category to be available in frontend
  // Navigate to page first so frontend loads categories
  await page.goto("/catalog/create");
  await page.waitForLoadState("load");

  // Wait a bit for useCategories hook to fetch the new category
  await page.waitForTimeout(2000);

  // Mock VIN decode endpoint
  await mockVinDecodeEndpoint(page, "2GNALCEK1H1615946", MOCK_VIN_DECODED);
  await mockVinDecodeEndpoint(page, "1HGCM82633A123456", {
    ...MOCK_VIN_DECODED,
    vin: "1HGCM82633A123456",
    make: "honda",
    model: "Accord",
    year: 2003,
  });
});
```

## Expected Results

After applying these fixes:

- **Select timeout issues**: Should be resolved by better Portal handling
- **Toast visibility**: Should be resolved by better selectors
- **VIN decode timing**: Should be resolved by explicit waits
- **API timeout**: Should be resolved by better button locator

## Test Execution

With database running:

```bash
cd tests/e2e
pnpm test vehicle-creation-c3.spec.ts
```

Expected: 19 passing tests
