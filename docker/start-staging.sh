#!/usr/bin/env bash
# Start staging with automatic postgres password sync
# ponytail: solves the "volume has old password" problem forever

set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="../.env.staging"

# Load password from .env.staging
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [[ -z "$POSTGRES_PASSWORD" ]]; then
  echo "❌ POSTGRES_PASSWORD not found in $ENV_FILE"
  exit 1
fi

echo "🚀 Starting staging infrastructure..."
docker compose -f docker-compose.staging.yml --env-file "$ENV_FILE" up -d db redis minio

echo "⏳ Waiting for postgres to be healthy..."
until docker exec prosell-staging-db pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "🔐 Syncing postgres password..."
docker exec prosell-staging-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$POSTGRES_PASSWORD';" > /dev/null 2>&1

echo "🚀 Starting API and Web..."
# Stop any unhealthy containers first, then start fresh
docker compose -f docker-compose.staging.yml --env-file "$ENV_FILE" stop api web 2>/dev/null || true
docker compose -f docker-compose.staging.yml --env-file "$ENV_FILE" up -d

echo "⏳ Waiting for services..."
sleep 10

# Show status
docker ps --filter "name=prosell-staging" --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "✅ Staging ready: http://localhost:3000 (web) | http://localhost:8000 (api)"
