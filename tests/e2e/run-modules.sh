#!/bin/bash

# ProSell E2E Modular Test Runner
# Ejecuta tests E2E por módulos en orden lógico

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
echo -e "${BLUE}║   ProSell E2E Modular Test Runner              ║${NC}"
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

# Function to run tests
run_tests() {
    local module_name=$1
    local test_pattern=$2
    local description=$3

    print_header "$module_name"
    echo "$description"
    echo ""

    if pnpm test $test_pattern; then
        print_success "$module_name PASSED"
        echo ""
        return 0
    else
        print_error "$module_name FAILED"
        echo ""
        return 1
    fi
}

# Parse arguments
MODULE=${1:-all}
SKIP_TO=${2:-0}

echo -e "${YELLOW}Ejecutando: $MODULE${NC}"
echo -e "${YELLOW}Directorio: $E2E_DIR${NC}"
echo ""

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
    echo "Start with: cd apps/web && pnpm dev"
fi

echo ""

# Track failures
FAILED_MODULES=()

# ============================================================================
# MÓDULO 1: Auth & Registro
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "auth" ]] || [[ $MODULE == "1" ]]; then
    if [ $SKIP_TO -le 1 ]; then
        run_tests \
            "MÓDULO 1: Auth & Registro" \
            "oauth-fixed.spec.ts" \
            "Tests: OAuth flow (FIXED - no hanging), Google/Facebook OAuth" \
        || FAILED_MODULES+=("Auth")
    fi
fi

# ============================================================================
# MÓDULO 2: Catálogo C3
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "catalog" ]] || [[ $MODULE == "2" ]]; then
    if [ $SKIP_TO -le 2 ]; then
        run_tests \
            "MÓDULO 2: Catálogo C3" \
            "categories.spec.ts products.spec.ts vehicles.spec.ts" \
            "Tests: Categories, Products, Vehicles CRUD" \
        || FAILED_MODULES+=("Catálogo")
    fi
fi

# ============================================================================
# MÓDULO 3: VIN Decode
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "vin" ]] || [[ $MODULE == "3" ]]; then
    if [ $SKIP_TO -le 3 ]; then
        run_tests \
            "MÓDULO 3: VIN Decode & Vehicle Form" \
            "vehicle-form-vin.spec.ts" \
            "Tests: VIN decode, form validation, field population" \
        || FAILED_MODULES+=("VIN")
    fi
fi

# ============================================================================
# MÓDULO 4: Leads
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "leads" ]] || [[ $MODULE == "4" ]]; then
    if [ $SKIP_TO -le 4 ]; then
        run_tests \
            "MÓDULO 4: Leads" \
            "leads.spec.ts manager-leads.spec.ts" \
            "Tests: Lead creation, assignment, manager view" \
        || FAILED_MODULES+=("Leads")
    fi
fi

# ============================================================================
# MÓDULO 5: Appointments
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "appointments" ]] || [[ $MODULE == "5" ]]; then
    if [ $SKIP_TO -le 5 ]; then
        run_tests \
            "MÓDULO 5: Appointments" \
            "appointments.spec.ts dealer-calendar.spec.ts" \
            "Tests: Appointment creation, dealer calendar, scheduling" \
        || FAILED_MODULES+=("Appointments")
    fi
fi

# ============================================================================
# MÓDULO 6: Features Avanzados
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "advanced" ]] || [[ $MODULE == "6" ]]; then
    if [ $SKIP_TO -le 6 ]; then
        run_tests \
            "MÓDULO 6: Features Avanzados" \
            "bulk-image-upload.spec.ts facebook-webhook.spec.ts" \
            "Tests: Image upload, bulk operations, webhooks" \
        || FAILED_MODULES+=("Features")
    fi
fi

# ============================================================================
# MÓDULO 7: End-to-End Integration
# ============================================================================
if [[ $MODULE == "all" ]] || [[ $MODULE == "e2e" ]] || [[ $MODULE == "7" ]]; then
    if [ $SKIP_TO -le 7 ]; then
        run_tests \
            "MÓDULO 7: End-to-End Integration" \
            "a6-verification.spec.ts" \
            "Tests: Full business flow (Catalog → Lead → Appointment)" \
        || FAILED_MODULES+=("E2E")
    fi
fi

# ============================================================================
# Smoke Tests (Quick)
# ============================================================================
if [[ $MODULE == "smoke" ]]; then
    run_tests \
        "Smoke Tests (Quick)" \
        "--grep @smoke" \
        "Quick-running critical path tests (~2 min)" \
    || FAILED_MODULES+=("Smoke")
fi

# ============================================================================
# Summary
# ============================================================================
print_header "SUMMARY"
echo ""

if [ ${#FAILED_MODULES[@]} -eq 0 ]; then
    print_success "TODOS LOS MÓDULOS PASARON ✅"
    echo ""
    echo "🎉 Ready for release!"
else
    print_error "MÓDULOS FALLIDOS:"
    for module in "${FAILED_MODULES[@]}"; do
        echo "  • $module"
    done
    echo ""
    echo "📁 Ver reporte: playwright-report/index.html"
    echo "📁 Ver screenshots: screenshots/ screenshots-summary/"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Done!"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
