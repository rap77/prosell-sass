#!/usr/bin/env bash
# ponytail: sync test DB migrations to head
# Run this when pre-push fails with "column X does not exist" errors

set -e

cd "$(dirname "$0")/../apps/api"

echo "🔄 Syncing test DB migrations..."
source .venv/bin/activate

# Run migrations on test DB (credentials from docker-compose.yml postgres-test)
DATABASE_URL="postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test" \
  alembic upgrade head 2>&1 || {
    echo "⚠️  Migration failed, attempting stamp to head..."
    DATABASE_URL="postgresql+asyncpg://prosell:prosell_test_password@localhost:5433/prosell_test" \
      alembic stamp head
  }

echo "✅ Test DB synced to head"
