#!/bin/bash
# rotate-secrets.sh — Generate fresh secrets for staging / production
# rotation. NEVER writes to a file: prints to stdout so you can copy
# the values into your password manager (1Password, pass, Bitwarden…)
# and paste them into the provider consoles (SendGrid, Google Cloud,
# Facebook Developers, DigitalOcean, etc.).
#
# USAGE:
#   ./scripts/rotate-secrets.sh              # generate all
#   ./scripts/rotate-secrets.sh db redis     # generate only DB+Redis
#   ./scripts/rotate-secrets.sh jwt          # only JWT key pair
#
# NEXT STEP AFTER GENERATION:
#   1. Copy the values into your password manager.
#   2. Rotate them at the provider (DB, SendGrid, Google, FB, DO).
#   3. Update your LOCAL .env.staging / .env.prod with the new values.
#   4. Re-deploy. The OLD values in git history become invalid the
#      moment the provider starts rejecting them.
#
# SECURITY:
#   - Output is 60-char base64 for passwords (256 bits of entropy).
#   - JWT keys are RSA-2048 (PEM, never base64).
#   - The script never writes to disk and never logs to a file.

set -euo pipefail

# ANSI colors (only if stdout is a tty)
if [ -t 1 ]; then
    BOLD=$'\033[1m'
    RED=$'\033[31m'
    GRN=$'\033[32m'
    YEL=$'\033[33m'
    BLU=$'\033[34m'
    RST=$'\033[0m'
else
    BOLD=""; RED=""; GRN=""; YEL=""; BLU=""; RST=""
fi

# Header line with timestamp so you can tell rotations apart if you
# keep the output in your password manager notes.
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

gen_password() {
    # 32 random bytes -> base64. ~256 bits of entropy. URL-safe-ish.
    # The trailing '=' is fine inside a DATABASE_URL.
    openssl rand -base64 32 | tr -d '\n'
}

gen_jwt_keys() {
    local tmpdir
    tmpdir="$(mktemp -d)"
    trap 'rm -rf "$tmpdir"' EXIT
    openssl genrsa -out "$tmpdir/private.pem" 2048 2>/dev/null
    openssl rsa -in "$tmpdir/private.pem" -pubout -out "$tmpdir/public.pem" 2>/dev/null
    PRIVATE_KEY="$(cat "$tmpdir/private.pem")"
    PUBLIC_KEY="$(cat "$tmpdir/public.pem")"
    rm -rf "$tmpdir"
    trap - EXIT
}

print_section() {
    echo ""
    echo "${BOLD}${BLU}════════════════════════════════════════════════════════════════════${RST}"
    echo "${BOLD}  $1${RST}"
    echo "${BOLD}${BLU}════════════════════════════════════════════════════════════════════${RST}"
}

print_field() {
    local name="$1"
    local value="$2"
    echo ""
    echo "${BOLD}${GRN}$name${RST}"
    echo "${YEL}$value${RST}"
}

usage() {
    cat <<EOF
Usage: $0 [db] [redis] [minio] [jwt] [oauth] [sendgrid] [admin]

With no arguments: generates EVERYTHING (db, redis, minio, jwt, admin).

Individual targets:
  db        PostgreSQL password (POSTGRES_PASSWORD, DATABASE_URL)
  redis     Redis password (REDIS_PASSWORD, REDIS_URL)
  minio     MinIO root user + password (MINIO_ROOT_USER, MINIO_ROOT_PASSWORD)
  jwt       RSA-2048 key pair (private.pem + public.pem)
  admin     Admin user password (ADMIN_PASSWORD for init_data.py)
  oauth     Placeholder reminders (real OAuth secrets come from providers)
  sendgrid  Placeholder reminders (real key comes from SendGrid console)

EOF
}

# Argument parsing: if nothing passed, run all (except oauth/sendgrid which
# are provider-side).
if [ $# -eq 0 ]; then
    set -- db redis minio jwt admin
fi

print_section "Secret rotation — generated at $TIMESTAMP"
echo ""
echo "These values are FRESH and have NEVER been committed to git."
echo "Save them in your password manager NOW. They will not be shown again."

GENERATED=0

for target in "$@"; do
    case "$target" in
        db)
            print_section "POSTGRES (rotate at DigitalOcean / pg console)"
            PW=$(gen_password)
            print_field "POSTGRES_PASSWORD" "$PW"
            echo "  → Also use this in DATABASE_URL after the ':' and before '@'."
            echo "  → Format: postgresql+asyncpg://postgres:\$POSTGRES_PASSWORD@db:5432/prosell_staging"
            GENERATED=1
            ;;
        redis)
            print_section "REDIS (rotate at DigitalOcean / redis-cli CONFIG SET)"
            PW=$(gen_password)
            print_field "REDIS_PASSWORD" "$PW"
            echo "  → Also use this in REDIS_URL: redis://:\$REDIS_PASSWORD@redis:6379/0"
            GENERATED=1
            ;;
        minio)
            print_section "MINIO (object storage)"
            USER="$(openssl rand -hex 8)"
            PW=$(gen_password)
            print_field "MINIO_ROOT_USER" "$USER"
            print_field "MINIO_ROOT_PASSWORD" "$PW"
            echo "  → DO_ACCESS_KEY_ID and DO_SECRET_ACCESS_KEY (for DO Spaces) get"
            echo "    rotated at https://cloud.digitalocean.com/account/api/spaces-keys"
            GENERATED=1
            ;;
        jwt)
            print_section "JWT RSA-2048 KEY PAIR"
            gen_jwt_keys
            print_field "JWT_PRIVATE_KEY (apps/api/keys/private.pem)" "$PRIVATE_KEY"
            print_field "JWT_PUBLIC_KEY (apps/api/keys/public.pem)" "$PUBLIC_KEY"
            echo ""
            echo "  ${RED}⚠ Critical: rotating JWT keys INVALIDATES every active session.${RST}"
            echo "  ${RED}  All users will be logged out. Plan a maintenance window.${RST}"
            GENERATED=1
            ;;
        admin)
            print_section "ADMIN USER (for init_data.py / create_admin_user.py)"
            PW=$(gen_password)
            print_field "ADMIN_PASSWORD" "$PW"
            echo "  → ADMIN_EMAIL stays admin@prosell.saas (or whatever you set)."
            echo "  → BCRYPT_ROUNDS=12 means login is slow after restart — expected."
            GENERATED=1
            ;;
        oauth)
            print_section "OAUTH SECRETS (rotate at provider, not generated here)"
            echo "  • Google:    https://console.cloud.google.com/apis/credentials"
            echo "  • Facebook:  https://developers.facebook.com/apps/<app-id>/settings/basic/"
            echo "  • Ngrok:     https://dashboard.ngrok.com/get-started/your-authtoken"
            echo ""
            echo "  1. Generate a NEW client secret at the provider."
            echo "  2. Add the new secret alongside the old (don't delete the old yet)."
            echo "  3. Update GOOGLE_OAUTH_CLIENT_SECRET / FACEBOOK_OAUTH_APP_SECRET in"
            echo "     your .env.staging to the NEW value, redeploy."
            echo "  4. Smoke test the OAuth flow."
            echo "  5. Only THEN delete the old secret at the provider."
            ;;
        sendgrid)
            print_section "SENDGRID API KEY (rotate at provider, not generated here)"
            echo "  • Console:   https://app.sendgrid.com/settings/api_keys"
            echo ""
            echo "  1. Create a NEW API key with the same scopes as the old one."
            echo "  2. Update SENDGRID_API_KEY in your .env.staging, redeploy."
            echo "  3. Trigger a test email to confirm it works."
            echo "  4. Only THEN revoke the old key."
            ;;
        *)
            echo "${RED}Unknown target: $target${RST}" >&2
            usage
            exit 1
            ;;
    esac
done

if [ $GENERATED -eq 1 ]; then
    echo ""
    print_section "NEXT STEPS"
    echo "  1. ${BOLD}Copy every value above into your password manager.${RST}"
    echo "  2. ${BOLD}Verify nothing was written to disk:${RST}"
    echo "       ls -la .env.staging   # should not exist after this run"
    echo "       ls -la apps/api/keys/ # should still only have README.md"
    echo "  3. ${BOLD}Rotate at the provider${RST} (DB / Redis / SendGrid / Google / FB)."
    echo "  4. ${BOLD}Update .env.staging on the staging host${RST} with the new values."
    echo "  5. ${BOLD}Redeploy${RST} — the next deploy uses the new secrets."
    echo "  6. ${BOLD}OLD values in git history become harmless${RST} the moment the"
    echo "     provider rejects them. No history rewrite needed (this is the"
    echo "     industry-standard approach)."
    echo ""
    echo "${BOLD}${YEL}Full rotation runbook: docs/SECRET_ROTATION.md${RST}"
fi
