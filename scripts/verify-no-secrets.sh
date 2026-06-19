#!/bin/bash
# verify-no-secrets.sh — Lightweight gitleaks-style pre-commit check.
#
# Scans git-staged files for common secret patterns (passwords, tokens,
# private keys, high-entropy strings). Exit 0 = clean, exit 1 = secrets
# found (blocks the commit).
#
# Patterns are intentionally conservative (high precision, lower recall).
# For deeper scanning, run `gitleaks detect --staged` (not bundled here).
#
# Allowlist:
#   - .env*.example files (placeholders are fine).
#   - scripts/verify-no-secrets.sh itself (we reference patterns literally).
#   - docs/ and CHANGELOG (commits in markdown often quote old tokens for
#     incident writeups; we trust docs/).
#
# Usage:
#   ./scripts/verify-no-secrets.sh           # scan staged files
#   ./scripts/verify-no-secrets.sh --all     # scan every tracked file
#
# Wired into .pre-commit-config.yaml as the `no-secrets` hook.

set -uo pipefail

RED=$'\033[31m'
GRN=$'\033[32m'
YEL=$'\033[33m'
BLD=$'\033[1m'
RST=$'\033[0m'

if [ -t 1 ]; then
    USE_COLOR=1
else
    USE_COLOR=0
    RED=""; GRN=""; YEL=""; BLD=""; RST=""
fi

MODE="staged"
if [ "${1:-}" = "--all" ]; then
    MODE="all"
fi

# --- Files to scan -----------------------------------------------------------

if [ "$MODE" = "staged" ]; then
    # Only added/copied/modified. Not deleted. No untracked.
    mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)
    if [ ${#FILES[@]} -eq 0 ]; then
        echo "${GRN}No staged files to scan.${RST}"
        exit 0
    fi
else
    mapfile -t FILES < <(git ls-files)
fi

# --- Allowlist filter --------------------------------------------------------

is_allowed() {
    local f="$1"
    case "$f" in
        # Placeholder files are explicitly OK
        *.env*.example) return 0 ;;
        # This script itself (and the rotation script) reference patterns
        scripts/verify-no-secrets.sh|scripts/rotate-secrets.sh) return 0 ;;
        # Pre-commit and hook scaffolding
        .pre-commit-config.yaml|scripts/check-hooks.sh) return 0 ;;
        # Docs may quote historical secrets in incident writeups
        docs/*|*.md) return 0 ;;
        # Lock files and generated noise
        package-lock.json|pnpm-lock.yaml|yarn.lock|uv.lock) return 0 ;;
        # .gitignore obviously references .env
        .gitignore) return 0 ;;
        # Binary types — pattern matching against binary is wasted CPU.
        # We pre-filter by extension BEFORE reading the file.
        *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.pdf|*.zip|*.tar*|*.gz|*.bz2|*.xz|*.7z) return 0 ;;
        # Minified / generated JS that ships with the framework
        apps/web/.next/*|apps/web/public/*) return 0 ;;
        # Test fixtures and conftests — may hardcode dev/test passwords
        # (e.g. postgresql://prosell:prosell_test_password@localhost). These
        # only run locally with the dev docker compose, never in prod.
        # The intent is documented in the file; the scanner is the wrong
        # place to catch it. If you add prod-facing code that hardcodes
        # creds, this allowlist will not save you.
        apps/api/conftest.py) return 0 ;;
        apps/api/tests/*/conftest.py|apps/api/tests/conftest.py) return 0 ;;
        apps/api/tests/**/conftest.py) return 0 ;;
        # init-test-db.py runs only against the local test container
        # (postgres on port 5433, see docker/docker-compose.yml).
        scripts/init-test-db.py) return 0 ;;
    esac
    return 1
}

# Pre-filter by extension to avoid reading 1600+ files we know can't have
# secrets as text. We only scan textual source-ish files.
is_scannable() {
    local f="$1"
    case "$f" in
        *.py|*.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.yml|*.yaml|*.toml|\
        *.sh|*.bash|*.zsh|*.env*|*.cfg|*.ini|*.conf|*.txt|*.sql|*.html|*.css|\
        *.scss|*.svelte|*.vue|*.rb|*.go|*.rs|*.java|*.kt|*.swift|*.c|*.cpp|\
        *.h|*.hpp|Dockerfile*|Makefile*|.env*|*.pem|*.key|*.cert) return 0 ;;
    esac
    return 1
}

# Skip files larger than 1 MB (almost certainly binary or generated)
is_too_big() {
    local f="$1"
    [ -f "$f" ] || return 1
    local size
    size=$(wc -c < "$f" 2>/dev/null || echo 0)
    [ "$size" -gt 1048576 ]
}

# --- Pattern definitions ----------------------------------------------------
# Format: "regex::label". Use POSIX ERE. Test BEFORE deploying.
#
# Each pattern is paired with a comment explaining what it catches and what
# the false-positive risk is.

# NOTE on regex syntax: we AVOID `\-` inside character classes because some
# grep builds (notably macOS BSD and some musl builds) interpret the `\-` as
# "literal hyphen at end of range expression" and error out with "Invalid
# range end" when the surrounding context includes more alternations. Placing
# `-` at the END of the class (no escape) is the portable form. We also
# escape `.` outside character classes only when it MUST be a literal dot
# (e.g. SG., GOCSPX-).
PATTERNS=(
    # ----- AWS / DO Spaces -----
    'AKIA[0-9A-Z]{16}::AWS access key ID'
    'aws_secret_access_key[[:space:]]*=[[:space:]]*["'\'']?[A-Za-z0-9/+=]{40}::AWS secret access key'
    'do_spaces_secret[[:space:]]*=[[:space:]]*["'\'']?[A-Za-z0-9/+=]{40}::DO Spaces secret'

    # ----- Generic API keys / tokens -----
    '(api[_-]?key|apikey|api[_-]?token)[[:space:]]*[:=][[:space:]]*["'\''][A-Za-z0-9_-]{20,}["'\'']::API key literal assignment'
    'x-api-key[[:space:]]*[:=][[:space:]]*["'\''][A-Za-z0-9_-]{20,}["'\'']::x-api-key header'

    # ----- SendGrid (legacy — retired in favour of Resend, kept as defence) -----
    'SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}::SendGrid API key'

    # ----- Resend -----
    # Word-boundary anchor (`\b`) prevents matching `re_` substrings buried
    # inside identifiers like `test_rbac_middleware_allows_matching_role`
    # (would otherwise match as `re_allows_matching_role`).
    '\bre_[A-Za-z0-9_]{20,}::Resend API key'

    # ----- Google OAuth -----
    'GOCSPX-[A-Za-z0-9_-]{20,}::Google OAuth client secret'

    # ----- GitHub / GitLab PATs -----
    'ghp_[A-Za-z0-9]{36}::GitHub personal access token'
    'gho_[A-Za-z0-9]{36}::GitHub OAuth token'
    'ghs_[A-Za-z0-9]{36}::GitHub server token'
    'ghr_[A-Za-z0-9]{36}::GitHub refresh token'
    'glpat-[A-Za-z0-9_-]{20,}::GitLab personal access token'

    # ----- Slack -----
    'xox[baprs]-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{20,}::Slack token'

    # ----- Stripe -----
    'sk_live_[A-Za-z0-9]{24,}::Stripe live secret key'
    'rk_live_[A-Za-z0-9]{24,}::Stripe live restricted key'

    # ----- JWT (eyJ prefix + 2 segments minimum) -----
    'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}::JWT (eyJ prefix)'

    # ----- RSA / EC private keys (PEM headers) -----
    '-----BEGIN ((RSA|EC|OPENSSH|DSA|PGP) )?PRIVATE KEY-----::PEM private key'
    '-----BEGIN ENCRYPTED PRIVATE KEY-----::Encrypted PEM private key'

    # ----- Connection strings with embedded credentials -----
    # Catches postgres://user:password@, mongodb://, mysql://, redis:// with
    # auth. The password segment is ROTATE_ME_… OR a 12+ char string from a
    # conservative alphabet (we deliberately exclude `-` to keep grep happy
    # — the password is matched by the high-entropy fallback pass if it's
    # all base64).
    '(postgres|postgresql|mysql|mongodb|redis|amqp|amqps)([+a-z0-9]*)://[A-Za-z0-9_.]+:(ROTATE_ME|[A-Za-z0-9_.+/=]{12,})@::Connection string with embedded password'
)

# ----- High-entropy base64 in suspicious contexts --------------------------
# A standalone 32+ char base64 string after KEY=/SECRET=/TOKEN= is suspicious.
# We exclude lines that look like placeholder instructions or are clearly docs.
ENTROPY_PATTERN='(PASSWORD|SECRET|TOKEN|KEY)[[:space:]]*[:=][[:space:]]*["'\'']?[A-Za-z0-9/+=]{32,}["'\'']?([[:space:]]*$|[[:space:]]*#)'

# ----- Scan ----------------------------------------------------------------

FOUND=0
SCANNED=0
SKIPPED=0

declare -a HITS

# Build a SINGLE big ERE with all the patterns as alternations. `grep -nE`
# scans the whole file in one pass (fast) and prints `file:lineno:match`
# so we can show context.
COMBINED_REGEX=""
for pat in "${PATTERNS[@]}"; do
    regex="${pat%%::*}"
    if [ -z "$COMBINED_REGEX" ]; then
        COMBINED_REGEX="$regex"
    else
        COMBINED_REGEX="${COMBINED_REGEX}|${regex}"
    fi
done

for file in "${FILES[@]}"; do
    if is_allowed "$file"; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    if ! is_scannable "$file"; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    if [ ! -f "$file" ]; then
        continue
    fi
    if is_too_big "$file"; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    SCANNED=$((SCANNED + 1))

    # One grep pass over the file. We then look at each hit and figure out
    # WHICH sub-pattern matched by re-testing with that pattern alone.
    # This is far faster than looping per-line.
    if matches=$(grep -nE "$COMBINED_REGEX" "$file" 2>/dev/null); then
        while IFS= read -r hit_line; do
            # hit_line format: "lineno:matched content"
            lineno="${hit_line%%:*}"
            content="${hit_line#*:}"
            # Identify the matching pattern for a helpful label
            label="pattern match"
            for pat in "${PATTERNS[@]}"; do
                regex="${pat%%::*}"
                lbl="${pat#*::}"
                if echo "$content" | grep -qE "$regex" 2>/dev/null; then
                    label="$lbl"
                    break
                fi
            done
            HITS+=("$file:${lineno}: ${label}  →  $content")
            FOUND=$((FOUND + 1))
        done <<< "$matches"
    fi

    # High-entropy check is a separate pass (different regex family).
    # Skip files where every match would be a placeholder anyway.
    if matches=$(grep -niE "$ENTROPY_PATTERN" "$file" 2>/dev/null); then
        while IFS= read -r hit_line; do
            lineno="${hit_line%%:*}"
            content="${hit_line#*:}"
            # Allow our own placeholder pattern
            if echo "$content" | grep -q "ROTATE_ME"; then
                continue
            fi
            HITS+=("$file:${lineno}: high-entropy value after KEY/SECRET/TOKEN  →  $content")
            FOUND=$((FOUND + 1))
        done <<< "$matches"
    fi
done

# ----- Report --------------------------------------------------------------

if [ $FOUND -eq 0 ]; then
    echo "${GRN}${BLD}✓ no-secrets${RST} scanned ${SCANNED} files, ${SKIPPED} allowed, 0 findings"
    exit 0
fi

echo "${RED}${BLD}✗ no-secrets FAILED${RST} — ${FOUND} potential secret(s) in staged files:"
echo ""
for hit in "${HITS[@]}"; do
    echo "  ${RED}•${RST} ${hit}"
done
echo ""
echo "${YEL}If any of these is a FALSE POSITIVE (placeholder, test data, etc.):${RST}"
echo "  1. Move the file to the allowlist in scripts/verify-no-secrets.sh,"
echo "     OR"
echo "  2. Replace the value with a clearly-marked placeholder like"
echo "     ROTATE_ME_<provider>_<action>."
echo ""
echo "${YEL}For deeper scanning, install gitleaks and run:${RST}"
echo "  gitleaks detect --staged --source ."
echo ""

exit 1
