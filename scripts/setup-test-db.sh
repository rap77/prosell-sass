#!/bin/bash
# Setup test database for ProSell integration tests
set -e

echo "🔧 Setting up ProSell test database..."

# Start postgres-test container
cd "$(dirname "$0")/../docker"
docker compose up -d postgres-test

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 3

# Initialize schema from models
echo "📊 Creating database schema..."
cd ../apps/api && uv run python ../../scripts/init-test-db.py

echo "✅ Test database ready at localhost:5433/prosell_test"
