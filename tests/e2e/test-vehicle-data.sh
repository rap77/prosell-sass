#!/bin/bash

echo "Testing vehicle data in E2E tests..."
echo "====================================="

# Test 1: Check that smoke tests pass
echo "Test 1: Running smoke tests with vehicle data..."
npx playwright test specs/smoke.spec.ts --grep="A7.19" --reporter=line 2>&1 | tee /tmp/test-output.log

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Smoke tests PASSED"
else
  echo "❌ Smoke tests FAILED"
  cat /tmp/test-output.log | tail -50
fi

# Test 2: Check that vehicle data is properly displayed
echo ""
echo "Test 2: Verifying vehicle data structure in tests..."
grep -n "vehicle.*title\|vehicle.*make\|vehicle.*model" specs/smoke.spec.ts | head -10

echo ""
echo "Test 3: Checking frontend transform function..."
grep -A5 "computeVehicleTitle\|transformLead" /home/rpadron/proy/prosell-sass/apps/web/src/lib/api/leads.ts | head -20

echo ""
echo "====================================="
echo "E2E Vehicle Data Test Complete"
