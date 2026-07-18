#!/bin/bash
# =============================================================================
# ProSell SaaS - Staging Deployment Script
# =============================================================================
# This script automates the staging deployment process
# Usage: ./scripts/deploy-staging.sh [--skip-build]
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"
ENV_FILE="$PROJECT_ROOT/.env.staging"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.staging.yml"

# Flags
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--skip-build]"
      echo ""
      echo "Options:"
      echo "  --skip-build       Skip Docker image build"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_file_exists() {
  if [[ ! -f "$1" ]]; then
    log_error "Required file not found: $1"
    exit 1
  fi
}

check_env_var() {
  local var_name=$1
  # `:-` yields an empty string when the variable is unset, so indirect
  # expansion does not trip `set -u`. The emptiness check below is what
  # actually reports a missing/placeholder value.
  local var_value=${!var_name:-}

  if [[ -z "$var_value" ]] || [[ "$var_value" == "CHANGE_ME_"* ]]; then
    log_warning "Environment variable $var_name is not set or still has placeholder value"
    return 1
  fi
  return 0
}

# =============================================================================
# PRE-DEPLOYMENT CHECKS
# =============================================================================

log_info "Starting ProSell SaaS Staging Deployment..."
log_info "Project root: $PROJECT_ROOT"

# Make sure Docker daemon is up — otherwise the first docker compose call
# fails with a cryptic "Cannot connect to the Docker daemon" error.
if ! docker info &>/dev/null; then
  log_error "Docker daemon is not running"
  exit 1
fi

# Check required files
log_info "Checking required files..."
check_file_exists "$ENV_FILE"
check_file_exists "$COMPOSE_FILE"
check_file_exists "$DOCKER_DIR/api.Dockerfile"
check_file_exists "$DOCKER_DIR/web.Dockerfile"

# Source environment file
log_info "Loading environment variables..."
source "$ENV_FILE"

# Check critical environment variables
log_info "Validating environment configuration..."
MISSING_VARS=0

if ! check_env_var "POSTGRES_PASSWORD"; then
  MISSING_VARS=$((MISSING_VARS + 1))
fi

if ! check_env_var "DATABASE_URL"; then
  MISSING_VARS=$((MISSING_VARS + 1))
fi

if ! check_env_var "GOOGLE_CLIENT_ID"; then
  MISSING_VARS=$((MISSING_VARS + 1))
fi

if ! check_env_var "SENDGRID_API_KEY"; then
  MISSING_VARS=$((MISSING_VARS + 1))
fi

if [[ $MISSING_VARS -gt 0 ]]; then
  log_warning "Found $MISSING_VARS missing or placeholder environment variables"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Deployment aborted"
    exit 1
  fi
fi

# Check JWT keys
log_info "Checking JWT keys..."
if [[ ! -f "$PROJECT_ROOT/apps/api/keys/private.pem" ]] || [[ ! -f "$PROJECT_ROOT/apps/api/keys/public.pem" ]]; then
  log_warning "JWT keys not found. Generating new keys..."
  bash "$SCRIPT_DIR/generate-jwt-keys.sh"
fi

# =============================================================================
# BUILD DOCKER IMAGES
# =============================================================================

if [[ "$SKIP_BUILD" == false ]]; then
  log_info "Building Docker images..."

  # Build via docker compose so the running containers use exactly what we
  # build — single source of truth. Building by hand with
  # `docker build -t prosell-*:staging` produced images the compose file never
  # referenced (it has its own `build:`), so containers ran a stale image while
  # migrations were applied against the fresh one. The web API URL build-arg
  # now comes from the compose file (http://localhost:8000), which is the
  # correct value for this local-host staging.
  cd "$DOCKER_DIR"
  docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml build || {
    log_error "Failed to build Docker images"
    exit 1
  }
  log_success "Docker images built successfully"
else
  log_warning "Skipping Docker image build (--skip-build flag set)"
fi

# =============================================================================
# STOP EXISTING SERVICES
# =============================================================================

log_info "Stopping existing services..."
cd "$DOCKER_DIR"
docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml down || true

# =============================================================================
# START INFRASTRUCTURE SERVICES
# =============================================================================

log_info "Starting infrastructure services (DB, Redis)..."
docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml up -d db redis

# Wait for DB to be ready
log_info "Waiting for database to be ready..."
for i in {1..30}; do
  if docker exec prosell-staging-db pg_isready -U postgres &>/dev/null; then
    log_success "Database is ready"
    break
  fi

  if [[ $i -eq 30 ]]; then
    log_error "Database failed to start after 30 seconds"
    exit 1
  fi

  sleep 1
done

# Wait for Redis to be ready
log_info "Waiting for Redis to be ready..."
for i in {1..30}; do
  if docker exec prosell-staging-redis redis-cli ping &>/dev/null; then
    log_success "Redis is ready"
    break
  fi

  if [[ $i -eq 30 ]]; then
    log_error "Redis failed to start after 30 seconds"
    exit 1
  fi

  sleep 1
done

# =============================================================================
# START APPLICATION SERVICES
# =============================================================================
# Migrations run inside the API container on startup: its CMD is
# `alembic upgrade head && init-db.py && init_data.py && uvicorn` (see
# docker/api.Dockerfile). Running them here too — against a separately built
# image — was both redundant and the source of image/DB drift, so it was
# removed. The container is the single place migrations and seeding happen.

log_info "Starting application services (API, Web)..."
docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml up -d

# Wait for MinIO bucket prosell-assets to be ready (depends on minio-init
# creating it on startup). We probe via the host-mapped port (9002) so we
# don't need mc configured in any container — the bucket has anonymous-read
# policy so a plain GET is enough.
log_info "Waiting for MinIO bucket prosell-assets to be ready..."
for i in {1..30}; do
  if curl -sf http://localhost:9002/prosell-assets/ -o /dev/null; then
    log_success "MinIO bucket prosell-assets is ready"
    break
  fi

  if [[ $i -eq 30 ]]; then
    log_error "MinIO bucket failed to become ready after 30 seconds"
    log_info "Check logs with: docker logs prosell-staging-minio-init"
    exit 1
  fi

  sleep 1
done

# =============================================================================
# WAIT FOR SERVICES TO BE HEALTHY
# =============================================================================

log_info "Waiting for services to be healthy..."

# Wait for API
for i in {1..60}; do
  if curl -f http://localhost:8000/api/v1/health &>/dev/null; then
    log_success "API is healthy"
    break
  fi

  if [[ $i -eq 60 ]]; then
    log_error "API failed to become healthy after 60 seconds"
    log_info "Check logs with: docker logs prosell-staging-api"
    exit 1
  fi

  sleep 1
done

# Wait for Web
for i in {1..60}; do
  if curl -f http://localhost:3000 &>/dev/null; then
    log_success "Web app is healthy"
    break
  fi

  if [[ $i -eq 60 ]]; then
    log_error "Web app failed to become healthy after 60 seconds"
    log_info "Check logs with: docker logs prosell-staging-web"
    exit 1
  fi

  sleep 1
done

# =============================================================================
# POST-DEPLOYMENT VERIFICATION
# =============================================================================

log_info "Running post-deployment verification..."

# Check all containers are running. With MinIO added, the long-running
# services are db, redis, api, web, minio (5). minio-init is restart:"no"
# and exits after setting up the bucket, so it isn't counted here.
EXPECTED_RUNNING=5
RUNNING_CONTAINERS=$(docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml ps -q | wc -l)
if [[ $RUNNING_CONTAINERS -eq $EXPECTED_RUNNING ]]; then
  log_success "All $EXPECTED_RUNNING containers are running (db, redis, api, web, minio)"
else
  log_warning "Expected $EXPECTED_RUNNING running containers, found $RUNNING_CONTAINERS"
fi

# Show container status
log_info "Container status:"
docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml ps

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================

echo ""
log_success "========================================="
log_success "Staging deployment completed successfully!"
log_success "========================================="
echo ""
log_info "Services:"
log_info "  - API:     http://localhost:8000"
log_info "  - Web:     http://localhost:3000"
log_info "  - API Docs: http://localhost:8000/docs"
echo ""
log_info "Logs:"
log_info "  API:  docker logs prosell-staging-api -f"
log_info "  Web:  docker logs prosell-staging-web -f"
log_info "  DB:   docker logs prosell-staging-db"
log_info "  All:  docker compose --env-file $ENV_FILE -f docker-compose.staging.yml logs -f"
echo ""
log_info "Next steps:"
log_info "  1. Run smoke tests from checklist:"
log_info "     cat .planning/staging-deployment-checklist.md"
log_info "  2. Test authentication flow"
log_info "  3. Test OAuth (Google/Facebook)"
log_info "  4. Test email delivery"
log_info "  5. Test inventory features"
echo ""
log_warning "Remember to:"
log_warning "  - Replace all CHANGE_ME_* values in .env.staging"
log_warning "  - Configure OAuth redirect URIs"
log_warning "  - Set up DNS for staging.prosell.com"
echo ""
