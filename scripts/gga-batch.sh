#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
GIT_DIR="$(git rev-parse --git-dir)"

MAX_FILES_PER_BATCH="${GGA_BATCH_MAX_FILES:-8}"
MAX_BYTES_PER_BATCH="${GGA_BATCH_MAX_BYTES:-50000}"
PRIMARY_PROVIDER="${GGA_PRIMARY_PROVIDER:-}"
FALLBACK_PROVIDERS="${GGA_FALLBACK_PROVIDERS:-gemini}"

if [[ -z "$PRIMARY_PROVIDER" && -f ".gga" ]]; then
  PRIMARY_PROVIDER="$(
    sed -n 's/^PROVIDER=\"\\([^\"]*\\)\"/\\1/p' .gga | head -n 1
  )"
fi

mapfile -t STAGED_FILES < <(git diff --cached --name-only --diff-filter=ACMRD)

if [[ "${#STAGED_FILES[@]}" -eq 0 ]]; then
  echo "No staged files to review."
  exit 0
fi

get_staged_file_size() {
  local file_path="$1"

  if git diff --cached --name-status -- "$file_path" | grep -q '^D'; then
    git show "HEAD:$file_path" 2>/dev/null | wc -c | tr -d ' '
    return
  fi

  git show ":$file_path" 2>/dev/null | wc -c | tr -d ' '
}

should_try_fallback() {
  local output_file="$1"

  grep -Eq \
    "Provider execution failed|You've hit your limit|Argument list too long|stream disconnected before completion|failed to connect to websocket|Read-only file system|Operation not permitted|timeout" \
    "$output_file"
}

get_embedded_review_status() {
  local output_file="$1"
  local last_status

  last_status="$(
    tail -n 120 "$output_file" \
      | sed -r 's/\x1B\[[0-9;]*[A-Za-z]//g' \
      | tr -d '\r' \
      | grep -E '^STATUS: (PASSED|FAILED)$' \
      | tail -n 1 || true
  )"
  printf '%s' "$last_status"
}

run_gga_once() {
  local provider="$1"
  local temp_index="$2"
  local output_file="$3"
  local status

  unset CLAUDECODE
  unset CLAUDE_CODE_ENTRYPOINT

  if [[ -n "$provider" ]]; then
    GIT_INDEX_FILE="$temp_index" GGA_PROVIDER="$provider" gga run >"$output_file" 2>&1
  else
    GIT_INDEX_FILE="$temp_index" gga run >"$output_file" 2>&1
  fi
  status=$?

  cat "$output_file"
  return "$status"
}

run_batch() {
  local batch_number="$1"
  shift
  local batch_files=("$@")
  local temp_index
  local output_file
  local provider
  local embedded_status
  local -a providers=()

  temp_index="$(mktemp "/tmp/gga-index.XXXXXX")"
  output_file="$(mktemp)"
  trap 'rm -f "$temp_index" "$output_file"' RETURN

  GIT_INDEX_FILE="$temp_index" git read-tree HEAD
  GIT_INDEX_FILE="$temp_index" git add -A -- "${batch_files[@]}"

  echo
  echo "==> Running GGA batch ${batch_number} (${#batch_files[@]} files)"
  printf '    %s\n' "${batch_files[@]}"

  if [[ -n "$PRIMARY_PROVIDER" ]]; then
    providers+=("$PRIMARY_PROVIDER")
  else
    providers+=("")
  fi

  if [[ -n "$FALLBACK_PROVIDERS" ]]; then
    # shellcheck disable=SC2206
    providers+=($FALLBACK_PROVIDERS)
  fi

  for index in "${!providers[@]}"; do
    provider="${providers[$index]}"

    if run_gga_once "$provider" "$temp_index" "$output_file"; then
      return 0
    fi

    if [[ -n "$provider" ]]; then
      embedded_status="$(get_embedded_review_status "$output_file")"

      if [[ "$embedded_status" == "STATUS: PASSED" ]]; then
        echo
        echo "✅ $provider devolvió STATUS: PASSED; se acepta el lote pese al ruido del provider."
        return 0
      fi

      if [[ "$embedded_status" == "STATUS: FAILED" ]]; then
        echo
        echo "❌ $provider devolvió STATUS: FAILED; se bloquea el lote."
        return 1
      fi
    fi

    if [[ "$index" -eq $((${#providers[@]} - 1)) ]]; then
      return 1
    fi

    if ! should_try_fallback "$output_file"; then
      return 1
    fi

    echo
    if [[ -n "$provider" ]]; then
      echo "⚠️  Provider '$provider' failed por causa recuperable. Probando fallback..."
    else
      echo "⚠️  Provider primario configurado en .gga falló por causa recuperable. Probando fallback..."
    fi
  done
}

declare -a current_batch=()
declare -a batches=()
current_bytes=0

flush_batch() {
  if [[ "${#current_batch[@]}" -eq 0 ]]; then
    return
  fi

  local joined=""
  local file
  for file in "${current_batch[@]}"; do
    joined+="${file}"$'\n'
  done
  batches+=("$joined")
  current_batch=()
  current_bytes=0
}

for file_path in "${STAGED_FILES[@]}"; do
  file_size="$(get_staged_file_size "$file_path")"
  [[ -z "$file_size" ]] && file_size=0

  if [[ "${#current_batch[@]}" -gt 0 ]] && {
    [[ "${#current_batch[@]}" -ge "$MAX_FILES_PER_BATCH" ]] ||
      (( current_bytes + file_size > MAX_BYTES_PER_BATCH ));
  }; then
    flush_batch
  fi

  current_batch+=("$file_path")
  current_bytes=$(( current_bytes + file_size ))
done

flush_batch

batch_number=1
for batch in "${batches[@]}"; do
  mapfile -t batch_files < <(printf '%s' "$batch")
  run_batch "$batch_number" "${batch_files[@]}"
  (( batch_number += 1 ))
done

echo
echo "✅ GGA batches passed (${#batches[@]} total)"
