#!/usr/bin/env bash
# =============================================================================
# rotate-db-password.sh — Rota el password de Postgres en producción.
# =============================================================================
#
# CONTEXTO
#   Cambiar POSTGRES_PASSWORD en .env.prod NO rota el password de una base ya
#   inicializada: el contenedor de Postgres solo lee esa variable la PRIMERA vez
#   (volumen vacío). Hay que aplicar ALTER USER por dentro. Este script lo hace.
#
# FLUJO
#   1. Editás .env.prod con el password NUEVO (POSTGRES_PASSWORD y el password
#      embebido en DATABASE_URL).  <-- lo hacés vos a mano, antes de correr esto.
#   2. Corrés este script. El script:
#        a. Lee el password nuevo de .env.prod (nunca lo imprime).
#        b. Aplica ALTER USER dentro del contenedor de la DB vía socket local
#           (auth trust → NO necesita el password viejo).
#        c. Verifica que el password nuevo funciona por TCP (scram-sha-256).
#        d. Recrea api + worker para que tomen el DATABASE_URL nuevo.
#
# USO (desde /opt/prosell en el host de producción)
#   ./scripts/rotate-db-password.sh             # ejecuta (pide confirmación)
#   ./scripts/rotate-db-password.sh --dry-run   # muestra qué haría, sin tocar
#   ./scripts/rotate-db-password.sh --yes       # sin prompt de confirmación
#
# REQUISITOS
#   - Stack prod corriendo: prosell-prod-db, prosell-prod-api, prosell-prod-worker
#   - Password nuevo SIN caracteres URL-especiales (/ : @ ? # & = +) para no tener
#     que percent-encodear el DATABASE_URL. Usá alfanumérico largo.
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

# --- sanity checks ----------------------------------------------------------
# 1) password sin caracteres URL-especiales (evita drift con DATABASE_URL)
if printf '%s' "$NEWPW" | grep -qE '[/:@?#&=+%]'; then
  die "El password nuevo tiene caracteres URL-especiales (/ : @ ? # & = + %). Usá alfanumérico o vas a tener que percent-encodear el DATABASE_URL a mano."
fi

# 2) el password embebido en DATABASE_URL coincide con POSTGRES_PASSWORD
URL_PW="$(printf '%s' "$DBURL" | sed -E 's#^[^:]+://[^:]+:([^@]*)@.*#\1#')"
if [ "$URL_PW" != "$NEWPW" ]; then
  die "El password de DATABASE_URL NO coincide con POSTGRES_PASSWORD. Actualizá los DOS en $ENV_FILE antes de rotar."
fi
ok "Preflight OK — usuario=$PGUSER db=$PGDB · POSTGRES_PASSWORD y DATABASE_URL en sync"

if $DRY_RUN; then
  log "[dry-run] ALTER USER \"$PGUSER\" WITH PASSWORD '<nuevo>'  (vía socket local en $DB_CONTAINER)"
  log "[dry-run] verificar por TCP con el password nuevo"
  log "[dry-run] docker compose -f $COMPOSE_FILE up -d --force-recreate api worker"
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
log "Recreando api + worker con el DATABASE_URL nuevo…"
docker compose -f "$COMPOSE_FILE" up -d --force-recreate api worker
ok "api + worker recreados."

ok "Rotación de password de Postgres COMPLETA."
echo
echo "Próximo paso recomendado: verificá el login en https://prosellweb.com y"
echo "revisá  docker logs prosell-prod-api --tail 50  por errores de conexión."
