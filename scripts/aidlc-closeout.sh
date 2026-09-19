#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# aidlc-closeout.sh
#
# Reconcile stale `[-]` markers in the active intent's aidlc-state.md, then
# run conservative post-intent verification.
#
# The AIDLC engine sometimes advances past a stage without transitioning its
# checkbox from in-progress `[-]` to completed `[x]`, even when the audit log
# carries unambiguous positive completion evidence (REVIEW_COMPLETED READY,
# STAGE_COMPLETED, SUMMARY_CONFIRMED with "Looks correct"). The result is a
# state file that reads as "mid-flight" long after the work is actually done,
# which breaks downstream tooling — most notably
# `scripts/aidlc-switch-harness.sh --audit`, which refuses a harness switch
# while any `[-]` marker is present.
#
# This script is the canonical, deterministic reconciliation path. For every
# stage left in `[-]`, it inspects the audit log for positive completion
# evidence. Stages with positive evidence are flipped to `[x]`; stages
# without it are surfaced as needing human attention and left untouched.
#
# Usage:
#   ./scripts/aidlc-closeout.sh                 # interactive: prints plan, asks
#   ./scripts/aidlc-closeout.sh --yes           # apply flips without asking
#   ./scripts/aidlc-closeout.sh --dry-run       # print plan, no edits, no commit
#   ./scripts/aidlc-closeout.sh --no-commit     # apply flips, skip git commit
#
# Exit codes:
#   0  no unreconciled markers and no verification failures
#   1  internal error or post-intent verification failure
#   2  invalid flag
#   3  pending human attention — some stages remain `[-]` without READY
#      evidence (the closeout reconciled what it could; the rest is on you)
#
# What it preserves (intentionally):
#   - aidlc/ workspace (intents, audit shards, memory, codekb) — never
#     touched outside the active intent's aidlc-state.md
#   - Other markers ([x], [S], [?], [R]) — never modified
#   - The legend comment line that contains `[-]` literally in prose
#
# What it does NOT do:
#   - It will NOT flip stages whose latest verdict is NOT-READY (real revision)
#   - It will NOT touch the [ ] / [?] / [R] markers in the unit table for
#     stages that were not flipped in the stage list
#   - It will NOT switch harnesses — pair it with aidlc-switch-harness.sh
#   - It will NOT modify artifacts during post-intent verification
# ----------------------------------------------------------------------------
set -euo pipefail

# ---- args -----------------------------------------------------------------
DRY_RUN=0
YES=0
NO_COMMIT=0
while [[ "${1:-}" == --* ]]; do
    case "${1}" in
        --dry-run)   DRY_RUN=1;    shift ;;
        --yes)       YES=1;        shift ;;
        --no-commit) NO_COMMIT=1;  shift ;;
        *) echo "error: unknown flag '${1}'" >&2
           echo "       valid: --dry-run, --yes, --no-commit" >&2
           exit 2 ;;
    esac
done
if [[ $# -gt 0 ]]; then
    echo "error: unexpected positional argument '${1:-}'" >&2
    exit 2
fi

# ---- preconditions --------------------------------------------------------
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT"

ACTIVE_INTENT_FILE="aidlc/spaces/default/intents/active-intent"
if [[ ! -f "$ACTIVE_INTENT_FILE" ]]; then
    echo "================================================================="
    echo "  AIDLC Closeout"
    echo "================================================================="
    echo ""
    echo "  No active intent (aidlc/spaces/default/intents/active-intent"
    echo "  is missing). Nothing to close."
    exit 0
fi
ACTIVE_INTENT="$(tr -d '[:space:]' < "$ACTIVE_INTENT_FILE")"
if [[ -z "$ACTIVE_INTENT" || "$ACTIVE_INTENT" == "default" ]]; then
    echo "error: active-intent file present but empty or placeholder" >&2
    exit 1
fi

STATE_FILE="aidlc/spaces/default/intents/$ACTIVE_INTENT/aidlc-state.md"
if [[ ! -f "$STATE_FILE" ]]; then
    echo "error: state file missing: $STATE_FILE" >&2
    exit 1
fi

AUDIT_DIR="aidlc/spaces/default/intents/$ACTIVE_INTENT/audit"
if [[ ! -d "$AUDIT_DIR" ]]; then
    echo "error: audit dir missing: $AUDIT_DIR" >&2
    exit 1
fi

# ---- post-intent audit -----------------------------------------------------
#
# These checks are deliberately local and read-only. They do not decide whether
# a state marker can be reconciled; they only report whether the completed
# intent leaves the expected evidence and workspace hygiene behind.
# ----------------------------------------------------------------------------
AUDIT_PASS=0
AUDIT_WARNING=0
AUDIT_FAIL=0

audit_pass() {
    AUDIT_PASS=$((AUDIT_PASS + 1))
    printf "  PASS: %s\n" "$1"
}

audit_warning() {
    AUDIT_WARNING=$((AUDIT_WARNING + 1))
    printf "  WARNING: %s\n" "$1"
}

audit_fail() {
    AUDIT_FAIL=$((AUDIT_FAIL + 1))
    printf "  FAIL: %s\n" "$1"
}

validate_traceability() {
    python3 - "$1" "$2" <<'PYEOF'
import json
import pathlib
import sys

traceability_path = pathlib.Path(sys.argv[1])
unit_name = sys.argv[2]

try:
    document = json.loads(traceability_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    print(f"traceability/{unit_name}: invalid JSON ({error})")
    raise SystemExit(1)

coverage = document.get("coverage")
meaningful_entries = (
    isinstance(coverage, list)
    and any(
        isinstance(entry, dict)
        and isinstance(entry.get("id"), str)
        and entry["id"].strip()
        and isinstance(entry.get("status"), str)
        and entry["status"].strip()
        and isinstance(entry.get("target"), str)
        and entry["target"].strip()
        for entry in coverage
    )
)
if not meaningful_entries:
    print(f"traceability/{unit_name}: coverage has no meaningful entries")
    raise SystemExit(1)
PYEOF
}

run_post_intent_audit() {
    local construction_dir codegen_dir unit_name required_artifact
    local traceability_file traceability_result start_date commit_hash commit_subject
    local dirty_aidlc_paths dirty_script_paths dirty_record dirty_path doctor_log
    local -a dirty_audit_paths=()
    local -a dirty_non_audit_paths=()
    local -a required_artifacts=(
        "code-generation-plan.md"
        "code-generation-questions.md"
        "code-summary.md"
        "traceability.json"
        "unit-test-instructions.md"
    )

    echo ""
    echo "  Post-intent audit (read-only)"
    echo "  ----------------------------------------------------------------"

    construction_dir="aidlc/spaces/default/intents/$ACTIVE_INTENT/construction"
    if [[ ! -d "$construction_dir" ]]; then
        audit_warning "code-generation artifacts: construction directory is absent"
    else
        local unit_count=0
        for codegen_dir in "$construction_dir"/*/code-generation; do
            [[ -d "$codegen_dir" ]] || continue
            unit_count=$((unit_count + 1))
            unit_name="$(basename "$(dirname "$codegen_dir")")"
            for required_artifact in "${required_artifacts[@]}"; do
                if [[ ! -f "$codegen_dir/$required_artifact" ]]; then
                    audit_fail "code-generation/$unit_name: missing $required_artifact"
                fi
            done
            if [[ ! -f "$codegen_dir/source-manifest.json" ]]; then
                audit_warning "code-generation/$unit_name: source-manifest.json is absent (informational; not consistently required)"
            fi

            traceability_file="$codegen_dir/traceability.json"
            if [[ ! -f "$traceability_file" ]]; then
                audit_warning "traceability/$unit_name: traceability.json is absent; JSON coverage could not be checked"
            elif traceability_result="$(validate_traceability "$traceability_file" "$unit_name")"; then
                audit_pass "traceability/$unit_name: valid JSON with meaningful coverage"
            else
                audit_warning "$traceability_result"
            fi
        done
        if [[ $unit_count -eq 0 ]]; then
            audit_warning "code-generation artifacts: no unit code-generation directories found"
        else
            audit_pass "code-generation artifacts: checked $unit_count unit(s)"
        fi
    fi

    start_date="$(awk -F': ' '/^- \*\*Start Date\*\*: / { print $2; exit }' "$STATE_FILE")"
    if [[ -z "$start_date" ]]; then
        audit_warning "commit format: intent start date is unavailable"
    else
        local checked_commits=0
        local invalid_commits=0
        while IFS=$'\t' read -r commit_hash commit_subject; do
            [[ -z "$commit_hash" ]] && continue
            if [[ "$commit_subject" == "chore(aidlc): append engine audit events" ]]; then
                printf "  INFO: commit format: skipped %s (generated audit event)\n" "$commit_hash"
                continue
            fi
            checked_commits=$((checked_commits + 1))
            if [[ ! "$commit_subject" =~ ^(feat|fix|docs|style|refactor|test|chore)\([a-z0-9][a-z0-9._/-]*\):\ .+ ]]; then
                audit_fail "commit format: $commit_hash has non-conventional subject: $commit_subject"
                invalid_commits=$((invalid_commits + 1))
            fi
        done < <(git log --format='%h%x09%s' --since="$start_date" -20)
        if [[ $invalid_commits -eq 0 ]]; then
            audit_pass "commit format: $checked_commits non-generated commit(s) checked since $start_date"
        fi
    fi

    dirty_script_paths="$(git status --porcelain -- scripts/aidlc-closeout.sh scripts/aidlc-switch-harness.sh)"
    if [[ -n "$dirty_script_paths" ]]; then
        audit_fail "working tree: closeout/switch scripts are dirty: $(printf '%s' "$dirty_script_paths" | tr '\n' ';' | sed 's/;$//')"
    fi

    dirty_aidlc_paths="$(git status --porcelain -- aidlc/)"
    while IFS= read -r dirty_record; do
        [[ -z "$dirty_record" ]] && continue
        dirty_path="${dirty_record:3}"
        if [[ "$dirty_path" == aidlc/spaces/*/audit/*.md ]]; then
            dirty_audit_paths+=("$dirty_path")
        else
            dirty_non_audit_paths+=("$dirty_path")
        fi
    done <<< "$dirty_aidlc_paths"

    if [[ ${#dirty_non_audit_paths[@]} -gt 0 ]]; then
        audit_fail "working tree: non-audit AIDLC paths are dirty: $(IFS=';'; printf '%s' "${dirty_non_audit_paths[*]}")"
    fi
    if [[ ${#dirty_audit_paths[@]} -gt 0 ]]; then
        audit_warning "working tree: ${#dirty_audit_paths[@]} generated AIDLC audit shard(s) await commit"
    fi
    if [[ -z "$dirty_script_paths" && ${#dirty_non_audit_paths[@]} -eq 0 && ${#dirty_audit_paths[@]} -eq 0 ]]; then
        audit_pass "working tree: aidlc/ and closeout/switch scripts are clean"
    fi

    doctor_log="$(mktemp -t aidlc-closeout.doctor.XXXXXX)"
    if ! command -v aidlc >/dev/null 2>&1; then
        audit_fail "aidlc doctor: aidlc is not on PATH"
    elif aidlc doctor >"$doctor_log" 2>&1; then
        if grep -qE '^[[:space:]]*warn[[:space:]]' "$doctor_log"; then
            audit_warning "aidlc doctor: warnings reported"
        else
            audit_pass "aidlc doctor: ok"
        fi
    else
        audit_fail "aidlc doctor: reported issues"
    fi
    rm -f "$doctor_log"

    echo ""
    printf "  Audit summary: PASS=%d WARNING=%d FAIL=%d\n" \
        "$AUDIT_PASS" "$AUDIT_WARNING" "$AUDIT_FAIL"
}

finish_closeout() {
    local needs_human_action="$1"

    run_post_intent_audit
    if [[ "$needs_human_action" -gt 0 ]]; then
        echo ""
        echo "  Some stages remain in [-] (no positive evidence). Resolve manually,"
        echo "  then re-run this script to confirm."
        exit 3
    fi
    if [[ $AUDIT_FAIL -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

# ---- evidence table -------------------------------------------------------
#
# Build two associative arrays per stage slug:
#   LAST_VERDICT[<slug>] = the verdict string of the LAST verdict-bearing
#                          event for that slug in document order
#   ANY_POSITIVE[<slug>] = "1" if any of the verdict-bearing events for that
#                          slug had verdict=READY or event=STAGE_COMPLETED
#
# Verdict-bearing events are anything with a **Verdict**: or **Answer**:
# field — REVIEW_COMPLETED, GATE_APPROVED, SUMMARY_CONFIRMED, etc.
# ----------------------------------------------------------------------------

AUDIT_TEXT="$(cat "$AUDIT_DIR"/*.md 2>/dev/null || true)"
if [[ -z "$AUDIT_TEXT" ]]; then
    echo "error: audit log is empty under $AUDIT_DIR" >&2
    exit 1
fi

declare -A LAST_VERDICT=()
declare -A LAST_EVENT=()
declare -A ANY_POSITIVE=()
while IFS=$'\t' read -r stage event verdict; do
    [[ -z "$stage" ]] && continue
    LAST_VERDICT["$stage"]="$verdict"
    LAST_EVENT["$stage"]="$event"
    # Positive evidence: verdict == READY, or a terminal STAGE_COMPLETED
    if [[ "$verdict" == "READY" || "$event" == "STAGE_COMPLETED" ]]; then
        ANY_POSITIVE["$stage"]=1
    fi
done < <(printf '%s\n' "$AUDIT_TEXT" | awk '
    /^\*\*Stage\*\*: / {
        s = $0; sub(/.*\*\*Stage\*\*: /, "", s); stage = s
    }
    /^\*\*Event\*\*: / {
        e = $0; sub(/.*\*\*Event\*\*: /, "", e); event = e
    }
    /^\*\*Verdict\*\*: / {
        v = $0; sub(/.*\*\*Verdict\*\*: /, "", v); verdict = v
    }
    /^\*\*Answer\*\*: / {
        v = $0; sub(/.*\*\*Answer\*\*: /, "", v); verdict = v
    }
    stage && event && verdict {
        printf "%s\t%s\t%s\n", stage, event, verdict
        stage = ""; event = ""; verdict = ""
    }
' 2>/dev/null || true)

# ---- stage-list scan ------------------------------------------------------
#
# Parse the "## Stage Progress" section: lines starting with `- [-] <slug>`,
# excluding the legend comment line which is inside an HTML comment block.
# ----------------------------------------------------------------------------
declare -a FLIP=()
declare -a KEEP=()

mapfile -t STUCK_ENTRIES < <(awk '
    BEGIN { in_comment = 0 }
    # Single-line HTML comment: contains both `<!-- ` and `-->`.
    /<!-- / && /-->/ { next }
    # Multi-line comment start.
    /<!-- / { in_comment = 1; next }
    # Multi-line comment body or end.
    in_comment {
        if (/-->/) in_comment = 0
        next
    }
    # Markdown table separator row.
    /^[[:space:]]*\|[[:space:]]*-+/ { next }
    /^- \[-\] [a-z0-9-]+/ {
        s = $0
        sub(/^.*- \[-\] /, "", s)
        sub(/ .*/, "", s)
        print s
    }
' "$STATE_FILE")

for entry in "${STUCK_ENTRIES[@]}"; do
    # entry format: "[-] <slug>"
    slug="${entry#*- }"
    slug="${slug#"${slug%%[![:space:]]*}"}"
    [[ -z "$slug" ]] && continue
    event="${LAST_EVENT[$slug]:-NONE}"
    verdict="${LAST_VERDICT[$slug]:-NONE}"
    # Positive only if (a) audit shows positive evidence ever AND (b) the
    # LATEST verdict isn't NOT-READY (real revision in flight).
    if [[ "${ANY_POSITIVE[$slug]:-0}" == "1" && "$verdict" != "NOT-READY" ]]; then
        FLIP+=("$slug|$event|$verdict")
    else
        KEEP+=("$slug|$event|$verdict")
    fi
done

# ---- print plan -----------------------------------------------------------
echo "================================================================="
echo "  AIDLC Closeout - intent: $ACTIVE_INTENT"
echo "================================================================="
echo ""
echo "  State file: $STATE_FILE"
echo "  Audit dir:  $AUDIT_DIR"
echo ""
echo "  Stuck [-] stages (excluding legend comment): ${#STUCK_ENTRIES[@]}"
echo "  Will flip to [x]:                            ${#FLIP[@]}"
echo "  Will leave (need human attention):           ${#KEEP[@]}"
echo ""

if [[ ${#FLIP[@]} -gt 0 ]]; then
    echo "  --- will flip (positive completion evidence) ---"
    for e in "${FLIP[@]}"; do
        IFS='|' read -r slug event verdict <<<"$e"
        printf "    [-] %-30s latest=%s verdict=%s\n" "$slug" "$event" "$verdict"
    done
    echo ""
fi

if [[ ${#KEEP[@]} -gt 0 ]]; then
    echo "  --- will leave (no positive evidence) ---"
    for e in "${KEEP[@]}"; do
        IFS='|' read -r slug event verdict <<<"$e"
        printf "    [-] %-30s latest=%s verdict=%s\n" "$slug" "$event" "$verdict"
    done
    echo ""
fi

# ---- dry-run short-circuit -----------------------------------------------
if [[ $DRY_RUN -eq 1 ]]; then
    echo "  --dry-run: no edits made."
    finish_closeout "${#KEEP[@]}"
fi

# ---- confirm unless --yes ------------------------------------------------
if [[ ${#FLIP[@]} -eq 0 ]]; then
    echo "  No flips to apply."
    finish_closeout "${#KEEP[@]}"
fi

if [[ $YES -eq 0 ]]; then
    read -r -p "  Apply ${#FLIP[@]} flip(s) above? [y/N] " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "  Aborted; no changes made."
        exit 0
    fi
fi

# ---- apply edits ----------------------------------------------------------
#
# Two passes via a Python helper:
#   1. Stage list `- [-] <slug>` -> `- [x] <slug>` for each FLIP slug
#   2. Unit table cells: only flip `[-]` in the column whose header matches
#      a FLIP slug. Skipped if the header for the column has a different
#      name than the FLIP slug (defensive — keeps the script portable).
#
# Atomic write via pathlib.Path.write_text (write-then-move semantics).
# ----------------------------------------------------------------------------

FLIPS_FILE="$(mktemp -t aidlc-closeout.flips.XXXXXX)"
trap 'rm -f "$FLIPS_FILE"' EXIT
printf '%s\n' "${FLIP[@]%%|*}" > "$FLIPS_FILE"
FLIP_COUNT="${#FLIP[@]}"

SUMMARY="$(python3 - "$STATE_FILE" "$FLIPS_FILE" <<'PYEOF'
import re, sys, pathlib

state_path = sys.argv[1]
flips_file = sys.argv[2]

flips = set()
with open(flips_file) as f:
    for line in f:
        flips.add(line.strip())

text = pathlib.Path(state_path).read_text()
lines = text.splitlines(keepends=False)

# Pass 1: stage-list lines under "## Stage Progress"
# Match:  - [-] <slug> — EXECUTE ...
stage_re = re.compile(r"^- \[-\] ([a-z0-9-]+) ")
flipped_stage = []
for i, line in enumerate(lines):
    m = stage_re.match(line)
    if not m:
        continue
    slug = m.group(1)
    if slug in flips:
        lines[i] = line.replace("- [-] " + slug, "- [x] " + slug, 1)
        flipped_stage.append(slug)

# Pass 2: unit-table cells. Find "## Unit Progress", parse the header row,
# then walk data rows and flip cells whose column matches a FLIP slug.
flipped_cell = []
unit_idx = None
for i, line in enumerate(lines):
    if line.strip() == "## Unit Progress":
        unit_idx = i
        break

if unit_idx is not None:
    header_idx = None
    for j in range(unit_idx + 1, len(lines)):
        if lines[j].lstrip().startswith("|"):
            header_idx = j
            break
    if header_idx is not None:
        header_cells = [
            c.strip() for c in lines[header_idx].strip().strip("|").split("|")
        ]
        slug_to_col = {
            name: col for col, name in enumerate(header_cells) if name in flips
        }
        # Data rows begin at header_idx + 2 (separator row is +1).
        for k in range(header_idx + 2, len(lines)):
            row = lines[k]
            if not row.lstrip().startswith("|"):
                break
            # Split by `|` keeping leading + trailing empty parts so cell
            # indices match the header's column index +1 (for the leading
            # empty segment from the opening `|`).
            parts = row.split("|")
            for slug, col in slug_to_col.items():
                cell_index = col + 1
                if cell_index < len(parts) and parts[cell_index].strip() == "[-]":
                    # Preserve original padding around the marker.
                    p = parts[cell_index]
                    parts[cell_index] = re.sub(r"\[-\]", "[x]", p)
                    flipped_cell.append((slug, parts[0].strip() or "?"))
            lines[k] = "|".join(parts)

out = "\n".join(lines)
if not out.endswith("\n"):
    out += "\n"
pathlib.Path(state_path).write_text(out)

print("STAGE_FLIPS=" + ",".join(flipped_stage))
print("CELL_FLIPS=" + ",".join(f"{s}/{u}" for s, u in flipped_cell))
PYEOF
)"

STAGE_FLIPS="$(printf '%s\n' "$SUMMARY" | sed -n 's/^STAGE_FLIPS=//p')"
CELL_FLIPS="$(printf '%s\n' "$SUMMARY" | sed -n 's/^CELL_FLIPS=//p')"

echo "  --- applied ---"
[[ -n "$STAGE_FLIPS" ]] && echo "    Stage list lines: $STAGE_FLIPS"
[[ -n "$CELL_FLIPS" ]]  && echo "    Unit-table cells: $CELL_FLIPS"
echo ""

# ---- verify ---------------------------------------------------------------
NEW_STUCK=$(awk '
    BEGIN { in_comment = 0 }
    /<!-- / && /-->/ { next }
    /<!-- / { in_comment = 1; next }
    in_comment {
        if (/-->/) in_comment = 0
        next
    }
    /^[[:space:]]*\|[[:space:]]*-+/ { next }
    /^- \[-\] [a-z0-9-]+/ {
        match($0, /\[-\] [a-z0-9-]+/); print substr($0, RSTART, RLENGTH)
    }
' "$STATE_FILE" | wc -l | tr -d '[:space:]')
NEW_STUCK=${NEW_STUCK:-0}

echo "  Remaining stuck [-] markers (excluding legend): $NEW_STUCK"
echo ""

# ---- commit ---------------------------------------------------------------
if [[ $NO_COMMIT -eq 0 ]]; then
    if git diff --quiet -- "$STATE_FILE" 2>/dev/null; then
        echo "  No state-file changes; skipping commit."
    else
        echo "  Committing state reconciliation under aidlc/ ..."
        git add "$STATE_FILE"
        if ! git commit -m "chore(aidlc): reconcile stale [-] markers via scripts/aidlc-closeout.sh

Flipped ${FLIP_COUNT} stage(s) with positive completion evidence (READY
verdicts in the audit log) that the engine left stuck in in-progress
state.

Intent: ${ACTIVE_INTENT}
Stages: ${STAGE_FLIPS}
Cells:  ${CELL_FLIPS}" \
            -m "Generated by scripts/aidlc-closeout.sh.
Verify with: bash scripts/aidlc-switch-harness.sh --audit"; then
            echo "  warning: git commit failed or was rejected by hooks." >&2
            echo "           the state file was updated; commit it manually" >&2
            echo "           with: git add $STATE_FILE && git commit" >&2
        fi
    fi
fi

# ---- exit code ------------------------------------------------------------
if [[ $NEW_STUCK -gt 0 ]]; then
    finish_closeout "${#KEEP[@]}"
fi
echo ""
echo "  Closeout complete. safe to switch harness with"
echo "    scripts/aidlc-switch-harness.sh opencode"
finish_closeout 0
