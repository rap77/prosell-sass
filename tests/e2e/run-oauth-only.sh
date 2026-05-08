#!/bin/bash

# OAuth E2E Test Runner - Solo OAuth Tests
# Ejecuta SOLO tests de OAuth (sin registro ni login normal)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
E2E_DIR="/home/rpadron/proy/prosell-sass/tests/e2e"
cd "$E2E_DIR" || exit 1

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OAuth E2E Test Runner (OAuth ONLY)           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print header
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if servers are running
print_header "Pre-flight Checks"
API_HEALTH=$(curl -s http://localhost:8000/health || echo "down")
WEB_HEALTH=$(curl -s http://localhost:3000 || echo "down")

if [[ $API_HEALTH == *"healthy"* ]]; then
    print_success "API server running"
else
    print_error "API server not responding"
    echo "Start with: cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py"
    exit 1
fi

if [[ $WEB_HEALTH == *"html"* ]] || [[ $WEB_HEALTH == *"DOCTYPE"* ]]; then
    print_success "Web server running"
else
    print_warning "Web server may not be running"
fi

echo ""

print_header "OAuth E2E Tests"
echo ""
echo "Ejecutando SOLO tests de OAuth (10 tests)"
echo "Tiempo estimado: 10-15 segundos"
echo ""

# Run OAuth tests
if pnpm test oauth-fixed.spec.ts; then
    print_success "OAuth tests PASSED"
    echo ""

    # Show summary
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Tests ejecutados:"
    echo ""
    echo "  ✅ should display Google OAuth button"
    echo "  ✅ should have correct button attributes"
    echo "  ✅ should redirect to OAuth endpoint on click (with timeout)"
    echo "  ✅ should generate unique state token for CSRF protection"
    echo "  ✅ should include required OAuth scopes"
    echo "  ✅ should show loading state during OAuth flow"
    echo "  ✅ should verify backend OAuth endpoint is accessible"
    echo "  ✅ should verify OAuth credentials are configured"
    echo "  ✅ should handle OAuth callback errors"
    echo "  ✅ should handle invalid state token"
    echo ""
    echo -e "${GREEN}🎉 TODOS LOS TESTS DE OAUTH PASARON${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    print_error "OAuth tests FAILED"
    echo ""
    echo "📁 Ver reporte: playwright-report/index.html"
    echo "📁 Ver screenshots: screenshots/"
    exit 1
fi
