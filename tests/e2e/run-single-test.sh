#!/bin/bash

# Single Test Runner - Ejecuta un solo test de OAuth
# Útil para debugging rápido

set -e

E2E_DIR="/home/rpadron/proy/prosell-sass/tests/e2e"
cd "$E2E_DIR" || exit 1

echo "╔════════════════════════════════════════════════╗"
echo "║   Single OAuth Test Runner                      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if servers are running
API_HEALTH=$(curl -s http://localhost:8000/health || echo "down")
WEB_HEALTH=$(curl -s http://localhost:3000 || echo "down")

if [[ $API_HEALTH == *"healthy"* ]]; then
    echo "✅ API server running"
else
    echo "❌ API server not responding"
    echo "Start with: cd apps/api && fastapi dev src/prosell/infrastructure/api/main.py"
    exit 1
fi

if [[ $WEB_HEALTH == *"html"* ]] || [[ $WEB_HEALTH == *"DOCTYPE"* ]]; then
    echo "✅ Web server running"
else
    echo "⚠️  Web server may not be running"
fi

echo ""
echo "Ejecutando: oauth-fixed.spec.ts (10 tests, ~10-15s)"
echo ""

# Run OAuth fixed tests
pnpm test oauth-fixed.spec.ts 2>&1 | tee /tmp/oauth-single-test.log
