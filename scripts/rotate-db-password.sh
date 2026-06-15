#!/usr/bin/env bash
# =============================================================================
# rotate-db-password.sh — Aplica la rotación del password de Postgres en prod.
# =============================================================================
#
# DÓNDE ENCAJA EN EL PROCESO
#   Este script automatiza los pasos 2-3 del runbook oficial de rotación
#   (docs/SECRET_ROTATION.md), SOLO para Postgres. El flujo completo es:
#
#     1. Generar el valor nuevo      → ./scripts/rotate-secrets.sh db
#     2. Aplicar al provider (ALTER) → ESTE SCRIPT
#     3. Deployar (.env + recreate)  → ESTE SCRIPT
#     4. Smoke test + log            → manual (ver runbook §4 y §"Historial")
#
#   Para Redis, OAuth, JWT, Admin y el resto, seguí el runbook oficial: este
#   script NO los toca.
#
# CONTEXTO TÉCNICO
#   Cambiar POSTGRES_PASSWORD en .env.prod NO rota el password de una base ya
#   inicializada: el contenedor de Postgres solo lee esa variable la PRIMERA vez
#   (volumen vacío). Hay que aplicar ALTER USER por dentro. Este script lo hace
#   vía socket local (auth trust → NO necesita el password viejo).
#
# FLUJO
#   1. Editás .env.prod con el password NUEVO:  <-- lo hacés vos, antes de correr.
#        - POSTGRES_PASSWORD=<nuevo>            (valor crudo)
#        - DATABASE_URL=...://user:<nuevo>@...  (percent-encodeado si tiene / + = etc.)
#   2. Corrés este script. El script:
#        a. Lee el password nuevo de .env.prod (nunca lo imprime).
#        b. Valida que POSTGRES_PASSWORD y DATABASE_URL estén en sync
#           (percent-decodea el de la URL antes de comparar).
#        c. Aplica ALTER USER dentro del contenedor de la DB.
#        d. Verifica que el password nuevo funciona por TCP (scram-sha-256).
#        e. Recrea api + worker (--no-build) para que tomen el DATABASE_URL nuevo.
#
# USO (desde /opt/prosell en el host de producción)
#   ./scripts/rotate-db-password.sh             # ejecuta (pide confirmación)
#   ./scripts/rotate-db-password.sh --dry-run   # muestra qué haría, sin tocar
#   ./scripts/rotate-db-password.sh --yes       # sin prompt de confirmación
#
# REQUISITOS
#   - Stack prod corriendo: prosell-prod-db, prosell-prod-api, prosell-prod-worker
#   - Recomendado: password URL-safe (`openssl rand -hex 32`) para evitar tener
#     que percent-encodear el DATABASE_URL. Si usás el base64 de rotate-secrets.sh,
#     percent-encodealo en la URL (/ → %2F, + → %2B, = → %3D).
# =============================================================================

set -euo pipefail

# --- args -------------------------------------------------------------------
DRY_RUN=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes | -y) ASSUME_YES=true ;;
    -h | --help)
      grep -E '^#( |$)' "$0" | sed -E 's/^# ?//'
      exit 0
      ;;
    *)
      echo "ERROR: argumento desconocido: $arg" >&2
      exit 2
      ;;
  esac
done

# --- paths ------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.prod"
COMPOSE_FILE="$REPO_ROOT/docker/docker-compose.prod.yml"
DB_CONTAINER="prosell-prod-db"

log() { printf '\033[0;36m▶\033[0m %s\n' "$*"; }
ok() { printf '\033[0;32m✓\033[0m %s\n' "$*"; }
die() {
  printf '\033[0;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}

# percent-decode: %2F → /, %2B → +, etc. (para el password embebido en la URL)
urldecode() { printf '%b' "${1//%/\\x}"; }

# --- preflight --------------------------------------------------------------
[ -f "$ENV_FILE" ] || die "No encuentro $ENV_FILE (¿corriste desde /opt/prosell?)"
[ -f "$COMPOSE_FILE" ] || die "No encuentro $COMPOSE_FILE"
command -v docker >/dev/null || die "docker no está en PATH"
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "El contenedor $DB_CONTAINER no está corriendo"

# read_env KEY -> imprime el valor (todo lo que va después del primer '='),
# sin comillas envolventes. Falla si la clave no está.
read_env() {
  local key="$1" line
  line="$(grep -E "^${key}=" "$ENV_FILE" | head -n1)" || true
  [ -n "$line" ] || die "Falta $key en $ENV_FILE"
  local val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  printf '%s' "$val"
}

PGUSER="$(read_env POSTGRES_USER)"
PGDB="$(read_env POSTGRES_DB)"
NEWPW="$(read_env POSTGRES_PASSWORD)"
DBURL="$(read_env DATABASE_URL)"

[ -n "$NEWPW" ] || die "POSTGRES_PASSWORD está vacío en $ENV_FILE"

# --- sanity check: POSTGRES_PASSWORD ↔ DATABASE_URL en sync -----------------
# Soporta passwords URL-safe (hex/alfanum) Y base64 percent-encodeado.
URL_PW_RAW="$(printf '%s' "$DBURL" | sed -E 's#^[^:]+://[^:]+:([^@]*)@.*#\1#')"
URL_PW_DECODED="$(urldecode "$URL_PW_RAW")"

if [ "$URL_PW_DECODED" != "$NEWPW" ]; then
  die "El password de DATABASE_URL no coincide con POSTGRES_PASSWORD. Actualizá los DOS en $ENV_FILE (y percent-encodeá el de la URL si tiene / + = etc.)."
fi

# Footgun: password con chars especiales pero CRUDO (sin encodear) en la URL.
# asyncpg/SQLAlchemy fallarían al parsear aunque psql funcione → abortar acá.
if printf '%s' "$NEWPW" | grep -qE '[/:@?#&=+%]' && [ "$URL_PW_RAW" = "$NEWPW" ]; then
  die "El password tiene chars URL-especiales pero está SIN percent-encodear en DATABASE_URL. Encodealo (/ → %2F, + → %2B, = → %3D) o usá un password hex (openssl rand -hex 32)."
fi
ok "Preflight OK — usuario=$PGUSER db=$PGDB · POSTGRES_PASSWORD y DATABASE_URL en sync"

# Recrear solo los servicios de app que YA existen. El worker puede no estar
# desplegado todavía (es un servicio nuevo en el compose); en ese caso NO lo
# tocamos — desplegarlo es una operación de deploy aparte, no de rotación.
RECREATE_SERVICES=(api)
if docker inspect prosell-prod-worker >/dev/null 2>&1; then
  RECREATE_SERVICES+=(worker)
fi

if $DRY_RUN; then
  log "[dry-run] ALTER USER \"$PGUSER\" WITH PASSWORD '<nuevo>'  (vía socket local en $DB_CONTAINER)"
  log "[dry-run] verificar por TCP con el password nuevo"
  log "[dry-run] docker compose -f $COMPOSE_FILE up -d --no-build --force-recreate ${RECREATE_SERVICES[*]}"
  ok "Dry-run completo. No se tocó nada."
  exit 0
fi

if ! $ASSUME_YES; then
  printf '\033[0;33m¿Rotar el password de Postgres en PRODUCCIÓN ahora? [y/N] \033[0m'
  read -r answer
  case "$answer" in
    y | Y | yes | YES) ;;
    *) die "Cancelado por el usuario." ;;
  esac
fi

# --- 1. ALTER USER (socket local = trust, no necesita password viejo) -------
log "Aplicando ALTER USER dentro de $DB_CONTAINER…"
# :'newpw' hace que psql escape/quote el valor de forma segura (a prueba de
# inyección y de caracteres raros). ON_ERROR_STOP=1 corta ante cualquier error.
docker exec -i "$DB_CONTAINER" \
  psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 -v newpw="$NEWPW" \
  -c "ALTER USER \"$PGUSER\" WITH PASSWORD :'newpw';" >/dev/null
ok "ALTER USER aplicado."

# --- 2. Verificar por TCP (fuerza scram-sha-256, prueba el password real) ---
log "Verificando el password nuevo por TCP…"
if docker exec -e PGPASSWORD="$NEWPW" -i "$DB_CONTAINER" \
  psql -U "$PGUSER" -d "$PGDB" -h 127.0.0.1 -c "SELECT 1;" >/dev/null 2>&1; then
  ok "El password nuevo funciona."
else
  die "La verificación falló: el password nuevo NO autentica por TCP. Revisá .env.prod."
fi

# --- 3. Recrear api + worker para que tomen el DATABASE_URL nuevo -----------
# --no-build: usa la imagen existente. NUNCA dispara un rebuild/deploy completo
# por accidente. Si la imagen no existe, falla fuerte (mejor que un deploy silencioso).
# Nota: aplica la config ACTUAL del compose — si el host pulleó cambios en
# docker-compose.prod.yml, revisalos antes de correr esto.
log "Recreando ${RECREATE_SERVICES[*]} con el DATABASE_URL nuevo (--no-build)…"
docker compose -f "$COMPOSE_FILE" up -d --no-build --force-recreate "${RECREATE_SERVICES[@]}"
ok "${RECREATE_SERVICES[*]} recreado(s)."

ok "Rotación de password de Postgres COMPLETA."
echo
echo "Próximos pasos (runbook docs/SECRET_ROTATION.md §4-§Historial):"
echo "  1. Smoke test: login en https://prosellweb.com"
echo "  2. Monitoreá  docker logs prosell-prod-api --tail 50  por errores de auth (~30 min)"
echo "  3. Anotá la rotación en la tabla 'Historial de rotaciones' de docs/SECRET_ROTATION.md"
