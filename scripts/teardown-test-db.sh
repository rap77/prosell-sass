#!/bin/bash
# Teardown test database
set -e

echo "🧹 Tearing down test database..."
cd docker
docker compose down -v postgres-test 2>/dev/null || true
echo "✅ Cleanup complete"
