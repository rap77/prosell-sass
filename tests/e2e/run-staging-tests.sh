#!/bin/bash

# Staging E2E Test Runner
# Runs comprehensive E2E tests on staging deployment

set -e

echo "=========================================="
echo "ProSell SaaS - Staging E2E Tests"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8000}"
TEST_EMAIL="${TEST_USER_EMAIL:-admin@prosell-demo.com}"
TEST_PASSWORD="${TEST_USER_PASSWORD:-Admin123!}"

echo "Configuration:"
echo "  BASE_URL: $BASE_URL"
echo "  API_URL: $API_URL"
echo "  TEST_USER: $TEST_EMAIL"
echo ""

# Check if services are running
echo "Checking services..."
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Web service is running at $BASE_URL"
else
    echo -e "${RED}✗${NC} Web service is NOT running at $BASE_URL"
    echo "Please start the staging services first"
    exit 1
fi

if curl -s -f "$API_URL/api/v1/auth/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API service is running at $API_URL"
else
    echo -e "${YELLOW}⚠${NC} API service health check failed (may still be starting)"
fi

echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Create auth storage state for authenticated tests
echo "Setting up authentication..."
node -e "
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('${BASE_URL}/auth/login');

    console.log('Filling credentials...');
    await page.fill('input[type=\"email\"], #email', '${TEST_EMAIL}');
    await page.fill('input[type=\"password\"], #password', '${TEST_PASSWORD}');

    console.log('Submitting login...');
    await page.click('button[type=\"submit\"], button:has-text(\"Sign In\")');

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Save storage state
    const storage = await context.storageState();
    require('fs').writeFileSync('.auth/storage-state.json', JSON.stringify(storage, null, 2));

    console.log('Authentication successful! Storage state saved.');
  } catch (error) {
    console.error('Login failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Authentication setup complete"
else
    echo -e "${RED}✗${NC} Authentication setup failed"
    echo "Creating empty storage state for unauthenticated tests..."
    mkdir -p .auth
    echo "{}" > .auth/storage-state.json
fi

echo ""
echo "Running E2E tests..."
echo "=========================================="
echo ""

# Run tests with HTML reporter
BASE_URL="$BASE_URL" \
TEST_USER_EMAIL="$TEST_EMAIL" \
TEST_USER_PASSWORD="$TEST_PASSWORD" \
pnpm test staging-smoke.spec.ts \
    --reporter=html \
    --reporter=list \
    --output="test-results/staging-$(date +%Y%m%d-%H%M%S)" \
    "$@"

EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi

echo ""
echo "Screenshots saved in: test-results/"
echo "HTML report: playwright-report/index.html"
echo ""
echo "To view the report:"
echo "  pnpm report"
echo ""

exit $EXIT_CODE
