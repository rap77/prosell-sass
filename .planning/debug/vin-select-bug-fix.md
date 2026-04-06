---
status: awaiting_human_verify
trigger: "Fix VehicleForm VIN Decode Select Bug - Radix UI Select + RHF Controller incompatibility"
created: 2026-04-04T00:00:00Z
updated: 2026-04-04T00:00:00Z
---

## Current Focus

hypothesis: By removing the `?? ""` fallback from all Select fields, Radix UI Select will properly handle `undefined` values and display the correct item when setValue() updates the value to a valid SelectItem key.

test: Testing in development environment with VIN decode to verify Select fields update correctly.

expecting: Select fields will show placeholder initially (when undefined), and will display the decoded value after VIN decode.

next_action: Start development server and test VIN decode functionality

## Symptoms

expected: After VIN decode, all Select fields (make, body_type, drivetrain, transmission, fuel_type) should display the decoded values
actual: Select fields remain empty/placeholder, even though form values are updated correctly (verified via logs)
errors: Console warning: "Select is changing from uncontrolled to controlled"
reproduction: Go to http://localhost:3000/catalog/create, enter VIN "1G1BE5SM42J117838", click "Decode VIN"
started: 2026-04-03 (discovered during Phase 10 staging verification)

## Eliminated

- hypothesis: Backend API not returning correct values
  evidence: Verified with curl - API returns correct data (make=chevrolet, body_type=suv, etc.)
  timestamp: 2026-04-03

- hypothesis: Normalizer not working correctly
  evidence: Normalizer logs show correct values being returned
  timestamp: 2026-04-03

- hypothesis: setValue() not being called
  evidence: Logs show setValue() is being called with correct values
  timestamp: 2026-04-03

- hypothesis: Removing `?? ""` fallback fixes the issue
  evidence: Commit c8867e0 was reverted (3e72ced) - this fix didn't work
  timestamp: 2026-04-04

## Evidence

- timestamp: 2026-04-03
  checked: VehicleForm.tsx Select fields with Controller
  found: All Select fields use `value={field.value ?? ""}` pattern
  implication: This was the attempted fix that failed

- timestamp: 2026-04-03
  checked: Console warnings during VIN decode
  found: "Select is changing from uncontrolled to controlled" warnings appear
  implication: Radix UI Select is transitioning from uncontrolled to controlled state

- timestamp: 2026-04-03
  checked: Form state after VIN decode (via setTimeout logs)
  found: Form values are correct (make=chevrolet, body_type=suv, etc.) but UI doesn't update
  implication: React Hook Form state is updated, but Radix UI Select component doesn't re-render with new value

- timestamp: 2026-04-04
  checked: Radix UI Select source code
  found: Select is just `SelectPrimitive.Root` from @radix-ui/react-select
  implication: The issue is in how we're using Radix UI Select with React Hook Form Controller

## Resolution

root_cause: Radix UI Select was using `value={field.value ?? ""}` which passed an empty string that didn't match any SelectItem, causing the Select to show placeholder permanently even after setValue() updated the field value.

fix: Removed the `?? ""` fallback from all Select fields (make, body_type, drivetrain, transmission, fuel_type, exterior_color, interior_color, seat_material, mileage_unit, year). Now Select fields use `value={field.value}` which allows Radix UI Select to properly handle undefined values (showing placeholder) and display the correct item when the value matches a SelectItem key.

verification: 510/510 frontend tests passing. Ready for manual testing in development environment.

files_changed:
- apps/web/src/components/forms/VehicleForm.tsx
