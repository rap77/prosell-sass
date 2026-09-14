# aidlc-search

Ranked, contextual search over the AI-DLC workflow tree
(`aidlc/spaces/<space>/intents/<intent>/{inception,construction,operation,verification}/`).

## What it does

For a query string, the script:

1. Scans every `.md`/`.json` file under the chosen intent(s) and stage.
2. Ranks files by match density (count of matches, capped at `--max-bytes` so
   one huge audit log does not dominate).
3. Prints the top-N files with a context window around each match
   (`grep -B <context> -A <context>`).
4. Optionally prints a tail listing of the remaining files with just paths and
   match counts (so you know what else to look at if the top missed).

The core benefit: replace the manual two-step pattern
(`grep -c "X"` → `grep -B 2 -A 5 "X" <top-3>`) with one call, and get the
ranking done for you.

## Usage

```bash
scripts/aidlc-search.sh "QUERY" [OPTIONS]
```

Options:

| Flag              | Default | Purpose                                                        |
| ----------------- | ------- | -------------------------------------------------------------- |
| `--intent <slug>` | (all)   | Restrict to one intent, e.g. `260911-cross-org-export-ux`      |
| `--top <N>`       | 5       | How many top files to print with context                       |
| `--context <N>`   | 3       | Lines of context around each match (symmetric `-B N -A N`)     |
| `--stage <name>`  | (all)   | `inception` \| `construction` \| `operation` \| `verification` |
| `--max-bytes <N>` | 200     | Per-file match-count ceiling (rank cap)                        |
| `--no-tail`       | off     | Skip the "Other files with matches" tail listing               |
| `--help`          | —       | Show usage                                                     |

Examples:

```bash
# What did the cross-org export intent decide about ALL_ORGS?
scripts/aidlc-search.sh "ALL_ORGS" --intent 260911-cross-org-export-ux

# tenant_id references across all intents, top 3 with 5 lines of context
scripts/aidlc-search.sh "tenant_id" --top 3 --context 5

# Only the construction stage of the active intent
scripts/aidlc-search.sh "viewingOrgId" --stage construction

cat aidlc/spaces/default/intents/active-intent
scripts/aidlc-search.sh "viewingOrgId" --intent "$(cat aidlc/spaces/default/intents/active-intent)"
```

## IDE wrappers (per-clone, not version-controlled)

The `.opencode/` and `.claude/` directories are gitignored at the workspace
root (they hold per-user / per-clone state). The skill wrappers therefore
live in each clone, not in the repo. Two thin wrappers are created on
demand:

### OpenCode

Create `.opencode/command/aidlc-search.md`:

```markdown
---
description: >
  Search AI-DLC workflow artifacts under aidlc/ with ranked, contextual output.
  Wraps scripts/aidlc-search.sh. Same behaviour from any shell, OpenCode,
  or Claude Code.
---

Invoke `scripts/aidlc-search.sh` with the arguments below passed through
verbatim. The script is the canonical implementation.

\`\`\`bash
scripts/aidlc-search.sh $ARGUMENTS
\`\`\`
```

After creation, `/aidlc-search` resolves inside OpenCode.

### Claude Code

Create `.claude/skills/aidlc-search/SKILL.md`:

```markdown
---
name: aidlc-search
description: >
  Search AI-DLC workflow artifacts under aidlc/ with ranked, contextual output.
  Wraps scripts/aidlc-search.sh.
argument-hint: '"<query>" [--intent <slug>] [--top N] [--context N] [--stage <name>]'
user-invocable: true
---

# aidlc-search

Run \`scripts/aidlc-search.sh $ARGUMENTS\` and read its output.

## Output interpretation

The script prints, in order:

1. A one-line header with intent scope, query, total matches, file count.
2. \`## Top N of M: <path>\` blocks with grep -B/-A context around each match.
3. Optionally, a \`## Other files with matches (no context):\` tail listing
   paths and counts when more files matched than \`--top\`.

Use the top blocks to answer the question; consult the tail only if the top
files do not contain the answer (rank is by density, which can mislead
when one file has many shallow mentions and another has one deep one).

## When to suggest \`--intent\`

If the user did not pass \`--intent\` and the script reports hundreds of
matches across dozens of files, the answer is probably specific to the
active intent. Run \`cat aidlc/spaces/default/intents/active-intent\` (the
cursor is at the workspace root) and re-invoke with \`--intent <slug>\`.
```

After creation, `/aidlc-search` resolves inside Claude Code.

## Why this is not a graph

Graphify is great for the application codebase (Python/TS AST, function
relationships), but its extraction on Markdown/JSON artifacts is shallow —
it returns headers and a few edges, which mostly just inflates the graph
with low-signal nodes. For aidlc/ artifacts, ranked keyword search with a
small context window is more precise per query and ~60% cheaper in tokens
than reading the top files in full. See the project's knowledge-graph
discussions for the measured comparison.

If semantic ("what's the difference between u1 and u2 about X?") queries
become common, the next step would be embeddings over a curated subset
(not the full 15 MB tree), not a global graph re-index.
