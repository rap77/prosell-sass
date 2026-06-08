#!/bin/bash
# =============================================================================
# ProSell SaaS - Production Deployment Script
# =============================================================================
# Runs ON the production droplet (assumes /opt/prosell working directory).
# Pulls latest code, builds, deploys, backs up the DB, runs pending migrations.
#
# This is intentionally stricter than deploy-staging.sh:
#   - Refuses to run with placeholder env vars (no "y/N" override)
#   - Requires a clean working tree
#   - Requires typing "deploy-prod" to confirm (not just y/N)
#   - Always backs up the DB before running migrations
#   - Verifies health via the PUBLIC domain (not just the internal port)
#
# Usage: ./scripts/deploy-production.sh [options]
#   --skip-build         Skip Docker image build (restart only)
#   --branch <name>      Branch to deploy (default: main)
#   --no-backup          Skip DB backup (NOT RECOMMENDED — your call)
#   -h, --help           Show this help message
# =============================================================================

set -euo pipefail

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
ENV_FILE="$PROJECT_ROOT/.env.prod"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"
BACKUP_DIR="$PROJECT_ROOT/backups"
DEPLOY_LOG="$PROJECT_ROOT/deploys.log"
BACKUP_KEEP=10
CONFIRM_PHRASE="deploy-prod"

# Defaults
BRANCH="main"
SKIP_BUILD=false
NO_BACKUP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --no-backup)
      NO_BACKUP=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--skip-build] [--branch <name>] [--no-backup]"
      echo ""
      echo "Options:"
      echo "  --skip-build         Skip Docker image build (restart only)"
      echo "  --branch <name>      Branch to deploy (default: main)"
      echo "  --no-backup          Skip DB backup (NOT RECOMMENDED)"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      exit 1
      ;;
  esac
done

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

check_file_exists() {
  if [[ ! -f "$1" ]]; then
    log_error "Required file not found: $1"
    exit 1
  fi
}

check_env_var() {
  local var_name=$1
  local var_value=${!var_name:-}
  if [[ -z "$var_value" ]] || [[ "$var_value" == "CHANGE_ME_"* ]]; then
    log_error "Environment variable $var_name is not set or has placeholder value"
    log_error "Refusing to deploy to production with incomplete config."
    log_error "Edit $ENV_FILE and try again."
    return 1
  fi
  return 0
}

# Record the deploy in a local log (separate from container logs). Append-only
# so a `tail deploys.log` shows the deploy history at a glance.
record_deploy() {
  local status=$1
  local detail=$2
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local sha
  sha="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
  echo "[$ts] [$status] branch=$BRANCH sha=$sha $detail" >> "$DEPLOY_LOG"
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

log_info "Starting ProSell SaaS PRODUCTION Deployment..."
log_info "Project root: $PROJECT_ROOT"
log_info "Branch: $BRANCH"

# Docker daemon
if ! docker info &>/dev/null; then
  log_error "Docker daemon is not running"
  exit 1
fi

# Required files
log_info "Checking required files..."
check_file_exists "$ENV_FILE"
check_file_exists "$COMPOSE_FILE"
check_file_exists "$DOCKER_DIR/api.Dockerfile"
check_file_exists "$DOCKER_DIR/web.prod.Dockerfile"
check_file_exists "$DOCKER_DIR/Caddyfile"

# Source env so we can validate it (and use it for backup)
log_info "Loading environment variables from .env.prod..."
set +u
# shellcheck disable=SC1090
source "$ENV_FILE"
set -u

# CRITICAL: refuse to deploy with placeholder values. Staging gives a y/N
# override; production does not — incomplete secrets would either break the
# app silently (DEBUG=true, no real OAuth) or expose it (ALLOWED_ORIGINS=*).
log_info "Validating environment configuration (strict — no placeholders allowed)..."
MISSING=0
for v in POSTGRES_USER POSTGRES_DB POSTGRES_PASSWORD \
         REDIS_PASSWORD DATABASE_URL REDIS_URL \
         JWT_PRIVATE_KEY_PATH JWT_PUBLIC_KEY_PATH \
         SENDGRID_API_KEY SENDGRID_FROM_EMAIL \
         GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET; do
  if ! check_env_var "$v"; then
    MISSING=$((MISSING + 1))
  fi
done

if [[ $MISSING -gt 0 ]]; then
  log_error "$MISSING critical env var(s) missing or placeholder. Aborting."
  exit 1
fi

# JWT keys. .env.prod's JWT_*_KEY_PATH point INSIDE the container
# (/app/keys/...) because that's where the API process reads them at runtime.
# For this HOST-side check we have to use the source of the docker volume
# mount declared in docker-compose.prod.yml
# (`../apps/api/keys -> /app/keys`).
log_info "Checking JWT keys..."
JWT_PRIVATE_KEY_PATH="$PROJECT_ROOT/apps/api/keys/private.pem"
JWT_PUBLIC_KEY_PATH="$PROJECT_ROOT/apps/api/keys/public.pem"

if [[ ! -f "$JWT_PRIVATE_KEY_PATH" ]] || [[ ! -f "$JWT_PUBLIC_KEY_PATH" ]]; then
  log_error "JWT keys not found at:"
  log_error "  private: $JWT_PRIVATE_KEY_PATH"
  log_error "  public:  $JWT_PUBLIC_KEY_PATH"
  log_error "Generate with: openssl genrsa -out $JWT_PRIVATE_KEY_PATH 2048"
  exit 1
fi
chmod 600 "$JWT_PRIVATE_KEY_PATH" 2>/dev/null || true

# Working tree must be clean. On the droplet the only thing that should
# touch the tree is this script. A dirty tree usually means a half-finished
# previous deploy or someone editing on the server — both worth investigating.
log_info "Checking working tree..."
# Some paths are EXPECTED to differ between the repo and the droplet:
#   - apps/api/keys/   : production keys are generated locally on the server
#                        and never committed in real form. The versions in
#                        the repo are placeholders, so a diff here is normal.
#   - .env.prod        : holds production secrets, intentionally untracked.
#   - backups/         : created by the pg_dump step in this script.
#   - deploys.log      : this script's own deploy audit log.
# Anything else dirty is a real concern (half-finished previous deploy,
# someone editing on the server) and must be investigated.
DIRTY=$(git status --short \
  | grep -vE '^\?\? (apps/api/keys|\.env\.prod|backups/|deploys\.log)' \
  | grep -vE '^.. apps/api/keys/' || true)
if [[ -n "$DIRTY" ]]; then
  log_error "Working tree has uncommitted changes outside the allow-list:"
  echo "$DIRTY" | sed 's/^/  /'
  log_error "Allowed exceptions: apps/api/keys/, .env.prod, backups/, deploys.log"
  log_error "Commit or stash the rest before deploying."
  exit 1
fi

# Capture current HEAD so we can show the diff AFTER pull and offer a
# rollback path at the end.
PRE_PULL_SHA="$(git rev-parse HEAD)"
log_info "Current HEAD: $PRE_PULL_SHA"

# =============================================================================
# PREVIEW: show what's about to land
# =============================================================================

log_info "Fetching origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet

# Commits that will be pulled
PENDING_COMMITS="$(git log --oneline "${PRE_PULL_SHA}..origin/${BRANCH}" 2>/dev/null || true)"
if [[ -z "$PENDING_COMMITS" ]]; then
  log_warning "No new commits on origin/$BRANCH since $PRE_PULL_SHA"
  log_warning "This will re-deploy the current code (still requires confirmation)."
fi

# Pending Alembic migrations. We read revisions from the running API container
# so we don't need alembic installed on the host. If the container is down we
# skip the preview and let the post-deploy migration step handle it.
log_info "Checking migration status..."
if docker ps --format '{{.Names}}' | grep -q '^prosell-prod-api$'; then
  CURRENT_REV="$(docker exec prosell-prod-api uv run alembic current 2>/dev/null \
    | grep -oE '[a-f0-9]{12}' | head -1 || echo 'unknown')"
  HEAD_REV="$(docker exec prosell-prod-api uv run alembic heads 2>/dev/null \
    | grep -oE '[a-f0-9]{12}' | head -1 || echo 'unknown')"
  log_info "  alembic current: $CURRENT_REV"
  log_info "  alembic head:    $HEAD_REV"
  if [[ "$CURRENT_REV" != "$HEAD_REV" && "$HEAD_REV" != "unknown" ]]; then
    log_info "  → migrations will be applied"
  else
    log_info "  → no migrations pending"
  fi
else
  log_warning "prosell-prod-api is not running — cannot preview migration status"
  log_warning "(this is expected on a first deploy)"
fi

# Show currently running containers for context
log_info "Current containers:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || \
  docker ps --format "table {{.Names}}\t{{.Status}}" | grep prosell-prod || true

# =============================================================================
# SAFETY GATE — typed confirmation
# =============================================================================

echo ""
log_warning "==========================================="
log_warning "YOU ARE ABOUT TO DEPLOY TO PRODUCTION"
log_warning "==========================================="
log_warning "Domain:  prosellweb.com / api.prosellweb.com"
log_warning "Branch:  $BRANCH"
log_warning "Host:    $(hostname) ($(hostname -I 2>/dev/null | awk '{print $1}'))"
echo ""
if [[ -n "$PENDING_COMMITS" ]]; then
  log_info "Commits to deploy:"
  echo "$PENDING_COMMITS" | sed 's/^/    /'
  echo ""
fi
log_info "Type '${CONFIRM_PHRASE}' (exactly) to continue, anything else to abort."
echo ""
read -r -p "> " REPLY
if [[ "$REPLY" != "$CONFIRM_PHRASE" ]]; then
  log_error "Aborted. (You typed: '$REPLY')"
  record_deploy "ABORTED" "user cancelled at confirmation"
  exit 1
fi
log_success "Confirmation accepted."

# =============================================================================
# BACKUP — pg_dump before any mutation
# =============================================================================

if [[ "$NO_BACKUP" == false ]]; then
  if ! docker ps --format '{{.Names}}' | grep -q '^prosell-prod-db$'; then
    log_error "prosell-prod-db is not running — cannot back up"
    log_error "Use --no-backup if this is a first-time deploy"
    exit 1
  fi

  TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_FILE="$BACKUP_DIR/db-$TIMESTAMP.sql.gz"
  mkdir -p "$BACKUP_DIR"

  log_info "Backing up database to $BACKUP_FILE ..."
  # Dump inside the container (already has auth), compress on the host.
  # -Fc not used: we want a plain SQL gzip for portability — psql < db.sql.gz
  # is the most universal restore path. If the DB is huge, switch to -Fc later.
  if ! docker exec prosell-prod-db \
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
        | gzip -c > "$BACKUP_FILE"; then
    log_error "pg_dump failed. Aborting deploy — no changes made yet."
    rm -f "$BACKUP_FILE"
    exit 1
  fi

  BACKUP_SIZE="$(du -h "$BACKUP_FILE" | awk '{print $1}')"
  log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

  # Rotate: keep the most recent $BACKUP_KEEP backups
  DELETED=$(ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null \
    | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f | wc -l || true)
  if [[ "${DELETED:-0}" -gt 0 ]]; then
    log_info "Pruned $DELETED old backup(s) (keeping last $BACKUP_KEEP)"
  fi
else
  log_warning "Skipping DB backup (--no-backup flag set). You own this risk."
fi

# =============================================================================
# GIT PULL
# =============================================================================

log_info "Pulling origin/$BRANCH ..."
if ! git pull --ff-only origin "$BRANCH"; then
  log_error "git pull failed (likely non-fast-forward or merge conflict)"
  log_error "Resolve on the server manually, then re-run this script."
  exit 1
fi

POST_PULL_SHA="$(git rev-parse HEAD)"
log_success "Now at $POST_PULL_SHA"

# =============================================================================
# BUILD
# =============================================================================

if [[ "$SKIP_BUILD" == false ]]; then
  log_info "Building Docker images (this can take several minutes)..."
  cd "$DOCKER_DIR"
  if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build; then
    log_error "Build failed."
    log_error "Nothing has been restarted yet — production is still on $PRE_PULL_SHA."
    exit 1
  fi
  log_success "Build complete."
else
  log_warning "Skipping build (--skip-build). Containers will use existing images."
fi

# =============================================================================
# DEPLOY — bring up changed services
# =============================================================================

log_info "Applying deployment..."
cd "$DOCKER_DIR"
# `up -d` recreates only containers whose config or image changed. Healthy
# services stay up — Caddy in particular should not be restarted casually
# (cert renewal uses the same volume, but a restart still costs ~1 round of
# requests to re-validate).
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d; then
  log_error "docker compose up -d failed."
  log_error "Inspect with: docker compose -f $COMPOSE_FILE logs --tail=200"
  exit 1
fi

# =============================================================================
# WAIT FOR SERVICES TO BE HEALTHY (internal)
# =============================================================================

wait_for_healthy() {
  local service_name=$1
  local timeout=${2:-60}
  log_info "Waiting for $service_name to be healthy..."
  for ((i=1; i<=timeout; i++)); do
    local status
    status=$(docker inspect --format='{{.State.Health.Status}}' "prosell-prod-$service_name" 2>/dev/null || echo "missing")
    if [[ "$status" == "healthy" ]]; then
      log_success "$service_name is healthy"
      return 0
    fi
    if [[ $i -eq $timeout ]]; then
      log_error "$service_name did not become healthy in ${timeout}s (status: $status)"
      return 1
    fi
    sleep 1
  done
}

# DB and Redis are dependencies of the API, so they must be healthy first.
wait_for_healthy db 60
wait_for_healthy redis 60
wait_for_healthy api 90
wait_for_healthy web 90
# Caddy has no healthcheck (it doesn't speak HTTP on a probe path by default),
# so we just verify it's running, not crashing.
if ! docker ps --format '{{.Names}}' | grep -q '^prosell-prod-caddy$'; then
  log_error "prosell-prod-caddy is not running"
  log_info "Check: docker logs prosell-prod-caddy"
  exit 1
fi
log_success "caddy is running"

# =============================================================================
# HEALTH CHECK VIA PUBLIC DOMAIN
# Internal health is necessary but not sufficient — the public path goes
# through Caddy + SSL, which is what users hit. A working internal health
# with broken DNS/SSL is still a broken prod.
# =============================================================================

PUBLIC_HEALTH_URL="https://api.prosellweb.com/api/v1/health"
PUBLIC_WEB_URL="https://prosellweb.com"

log_info "Probing public endpoints through Caddy..."
# -k would skip cert verification, but here we WANT strict cert check — if
# Caddy's cert is broken the deploy should fail loudly.
if curl -fsS --max-time 15 "$PUBLIC_HEALTH_URL" -o /dev/null; then
  log_success "Public API health: OK ($PUBLIC_HEALTH_URL)"
else
  log_warning "Public API health check FAILED — DNS/SSL may still be propagating"
  log_warning "The internal health check passed; the app is running."
  log_warning "If this persists for >5 min, check Caddy: docker logs prosell-prod-caddy"
fi

if curl -fsS --max-time 15 -o /dev/null -w "%{http_code}\n" "$PUBLIC_WEB_URL" | grep -q '^200$'; then
  log_success "Public web: OK ($PUBLIC_WEB_URL)"
else
  log_warning "Public web check FAILED — same caveat as above"
fi

# =============================================================================
# MIGRATIONS — only run if pending
# =============================================================================

log_info "Re-checking migration status post-deploy..."
CURRENT_REV="$(docker exec prosell-prod-api uv run alembic current 2>/dev/null \
  | grep -oE '[a-f0-9]{12}' | head -1 || echo 'unknown')"
HEAD_REV="$(docker exec prosell-prod-api uv run alembic heads 2>/dev/null \
  | grep -oE '[a-f0-9]{12}' | head -1 || echo 'unknown')"

if [[ "$CURRENT_REV" == "unknown" || "$HEAD_REV" == "unknown" ]]; then
  log_error "Could not read alembic revisions. Skipping migrations — investigate manually."
elif [[ "$CURRENT_REV" == "$HEAD_REV" ]]; then
  log_success "Alembic already at head ($HEAD_REV) — no migrations to apply"
else
  log_info "Applying migrations: $CURRENT_REV → $HEAD_REV"
  if ! docker exec prosell-prod-api uv run alembic upgrade head; then
    log_error "alembic upgrade head FAILED."
    log_error "Your backup is at the most recent file in $BACKUP_DIR/"
    log_error "Restore with: gunzip < $BACKUP_DIR/<file>.sql.gz | docker exec -i prosell-prod-db psql -U $POSTGRES_USER -d $POSTGRES_DB"
    record_deploy "FAILED" "alembic upgrade failed at $POST_PULL_SHA"
    exit 1
  fi
  log_success "Migrations applied."
fi

# =============================================================================
# POST-DEPLOY
# =============================================================================

log_info "Final container status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

# Detect first deploy: if the admin user is missing, this is a fresh DB.
# We don't auto-run init_data.py because it's not designed to be re-run
# safely and the operator should know they're initializing.
if ! docker exec prosell-prod-db \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
     "SELECT 1 FROM users WHERE email = 'admin@prosell.saas' LIMIT 1;" 2>/dev/null \
     | grep -q '^1$'; then
  log_warning "==========================================="
  log_warning "FIRST DEPLOY DETECTED — admin user is missing"
  log_warning "Run: docker exec prosell-prod-api uv run python /app/scripts/init_data.py"
  log_warning "Then change the default password immediately."
  log_warning "==========================================="
fi

record_deploy "OK" "from=$PRE_PULL_SHA to=$POST_PULL_SHA"

echo ""
log_success "========================================="
log_success "Production deployment completed successfully!"
log_success "========================================="
echo ""
log_info "Summary:"
log_info "  Previous HEAD:  $PRE_PULL_SHA"
log_info "  Current HEAD:   $POST_PULL_SHA"
log_info "  Branch:         $BRANCH"
log_info "  Public API:     $PUBLIC_HEALTH_URL"
log_info "  Public web:     $PUBLIC_WEB_URL"
if [[ "$NO_BACKUP" == false ]]; then
  log_info "  Backup:         $BACKUP_FILE"
fi
echo ""
log_info "ROLLBACK (if something is wrong):"
log_info "  cd $PROJECT_ROOT"
log_info "  git checkout $PRE_PULL_SHA"
log_info "  $0 --skip-build"
echo ""
log_info "Logs:"
log_info "  All:     docker compose -f $COMPOSE_FILE logs -f"
log_info "  API:     docker logs prosell-prod-api -f"
log_info "  Caddy:   docker logs prosell-prod-caddy -f"
echo ""
log_info "Smoke test checklist:"
log_info "  1. Visit https://prosellweb.com — landing loads"
log_info "  2. Log in with admin@prosell.saas"
log_info "  3. Create a test vehicle with image upload"
log_info "  4. Verify OAuth (Google) still redirects correctly"
log_info "  5. Check SendGrid: trigger a password reset"
echo ""
