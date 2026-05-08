---
status: verifying
trigger: "Debug Playwright test failure: should update drivetrain select field after VIN decode - selector timeout"
created: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## Current Focus

hypothesis: `SelectControlled` passes lowercase value ("fwd") to Radix Select, but SelectItem values are uppercase ("FWD"), so Radix's case-sensitive comparison fails and no option gets `data-state="checked"`
test: Verify that `SelectControlled` passes the original lowercase value to Radix Select instead of normalizing it to match the option value
expecting: Find that line 91 in select-controlled.tsx passes `value={value}` directly without normalization
next_action: Fix `SelectControlled` to normalize the value to match the option's actual value (case-sensitive)

## Symptoms

expected: Test should find the selected option in the drivetrain dropdown after VIN decode
actual: Test times out waiting for selector `[role="option"][data-state="checked"]` to match an element
errors: `Error: locator.textContent: Test timeout of 30000ms exceeded. Call log: - waiting for locator('[role="option"][data-state="checked"]')`
reproduction: Run `pnpm test tests/e2e/specs/vehicle-form-vin.spec.ts -g "should update drivetrain select field after VIN decode"`
started: Test was passing before, now failing (needs verification of when it started failing)

## Evidence

- timestamp: 2026-05-06T00:00:00Z
  checked: Test file `tests/e2e/specs/vehicle-form-vin.spec.ts` lines 169-189
  found: Test uses `[role="option"][data-state="checked"]` selector which times out
  implication: Selector doesn't match any element in the DOM

- timestamp: 2026-05-06T00:00:00Z
  checked: Page snapshot from error message
  found: Options show `[active]` attribute but NO `data-state="checked"` attribute
  implication: `[active]` means the option is focused/hovered, NOT selected

- timestamp: 2026-05-06T00:00:00Z
  checked: Radix UI Select source code (apps/web/node_modules/@radix-ui/react-select/dist/index.mjs line 853)
  found: `data-state: isSelected ? "checked" : "unchecked"` - Radix DOES set data-state="checked" on selected options
  implication: The page snapshot shows NO selected option because NO option is actually selected

- timestamp: 2026-05-06T00:00:00Z
  checked: Mock VIN decode data (tests/e2e/fixtures/mock-data.ts line 217)
  found: `drivetrain: "fwd"` (lowercase)
  implication: VIN decode returns lowercase value

- timestamp: 2026-05-06T00:00:00Z
  checked: Drivetrain options in VehicleFormAttributes.tsx (lines 271-276)
  found: Options have uppercase values: `{ value: "FWD", label: "FWD (Delantera)" }`
  implication: Option values are uppercase

- timestamp: 2026-05-06T00:00:00Z
  checked: SelectControlled component (apps/web/src/components/ui/select-controlled.tsx lines 63, 91)
  found: Line 63 does case-insensitive lookup for display label, but line 91 passes original `value` to Radix Select
  implication: Radix Select receives `value="fwd"` but SelectItem has `value="FWD"`, so case-sensitive comparison fails

- timestamp: 2026-05-06T00:00:00Z
  checked: Similar test at lines 121-141 (make select test)
  found: Uses same selector and should pass because make values match case (both "chevrolet")
  implication: Make test might pass if FB_BRANDS has lowercase keys matching VIN decode output

## Resolution

root_cause: `SelectControlled` passes the original form value (e.g., "fwd") to Radix Select, but SelectItem values are uppercase ("FWD"). Radix UI uses case-sensitive comparison to determine which option is selected, so `isSelected` is false and `data-state="checked"` is not set. The component does case-insensitive lookup for the display label but doesn't normalize the value passed to Radix Select.

fix: In `SelectControlled`, normalize the value passed to Radix Select to match the actual option value (case-sensitive). Use the case-insensitive lookup result to find the correct option value and pass that to Radix Select instead of the original form value.

verification: ✅ TEST PASSED - `@smoke should update drivetrain select field after VIN decode` now passes. The drivetrain option now correctly shows `data-state="checked"` attribute.

files_changed:
- apps/web/src/components/ui/select-controlled.tsx
