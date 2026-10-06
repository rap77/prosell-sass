# Vendored anti-slop Oxlint plugin

Installed 2026-10-06 via the `install-anti-slop` Claude Code skill
(`~/.claude/skills/install-anti-slop/scripts/install.mjs`), copied from the
skill's bundled `assets/anti-slop/`.

## Source identity

**Unknown.** The skill's bundled copy carries no upstream repository, commit,
or version record for the top-level plugin (`index.ts`, `rules/`, `shared/`,
`effect/`) — only the nested `vendor/eslint-stylistic/` rule does, in its own
`UPSTREAM.md` (real source: ESLint Stylistic, commit
`435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`, MIT-licensed, `LICENSE` retained).
Per the installing skill's own instruction ("if provenance cannot be
established, record it as unknown rather than guessing"), the top-level
plugin's identity is recorded as unknown, not guessed.

An un-activated reference copy of this same skill bundle also lives at
`~/.config/anti-slop/` (installed earlier the same day, as a cross-project
template — see its own `UPSTREAM.md`). This installation in `apps/web` is
independent and is the one actually wired into this project's tooling.

## Intentional deviations / project-specific adaptations

- Installed at `apps/web/tools/oxlint/anti-slop/` (not the repo root) because
  `apps/web` is the only JS/TS workspace in this monorepo today — `apps/api`
  is Python, and `packages/` does not exist yet.
- Registered in `apps/web/.oxlintrc.json` (JSON config, not the experimental
  `oxlint.config.ts` TS form) — `.oxlintrc.json` is the stable, fully-
  supported format across runtimes per `oxlint --help`; JS/TS config files
  are explicitly documented as experimental.
- The Effect plugin (`anti-slop-effect/*`) was copied but is **not**
  registered in `.oxlintrc.json` — `apps/web/package.json` has no direct
  `effect` dependency, and the installing skill requires one (or an explicit
  user request) before enabling it.
- `apps/web/tsconfig.json`'s `exclude` gained `tools/oxlint/anti-slop` — the
  vendored plugin's relative `.ts` imports require `allowImportingTsExtensions`
  (satisfied at lint time by Oxlint's own Node-native TS loader), which this
  project's `tsc` config does not enable; excluding the vendored tree keeps
  `pnpm typecheck` clean without changing the compiler options the
  application code type-checks against.
- Root `.prettierignore` gained `apps/web/tools/oxlint/anti-slop/` so
  `prettier --write`/`--check` (including the pre-push full-repo check)
  never reformats the vendored tree — formatting it is upstream's call, not
  this repo's, and reformatting would diverge from the pristine snapshot a
  future update diffs against.

## Verification run at install time (2026-10-06)

- `pnpm typecheck` (apps/web): clean after the `tsconfig.json` exclude above.
- `pnpm lint` (apps/web, existing ESLint — unrelated to this plugin): clean,
  exit 0 — confirms the new files/config did not regress the existing
  ESLint setup.
- `pnpm exec prettier --check .` (repo root): clean.
- `oxlint .` (apps/web, this new config): **3,171 findings across existing
  project source** — reported to the user, not auto-fixed. Breakdown by
  rule:
  - 1965 × `require-readable-spacing` (mechanically autofixable)
  - 495 × `require-safety-comment-for-type-assertion`
  - 217 × `no-module-mocking`
  - 105 × `no-runtime-typeof`
  - 95 × `no-chained-type-assertions`
  - 84 × `no-unsafe-dictionary-type`
  - 68 × `no-known-value-widening`
  - 42 × `no-unknown-parameters`
  - 13 × `no-unknown-returns`
  - 7 × `no-conditional-empty-object-spread`
  - 6 × `no-shape-in-symbol-names`
  - 6 × `no-array-filter-map`

  Per the installing skill's own instruction, these were **not** fixed,
  suppressed, or downgraded as part of installation — cleanup is a separate,
  explicitly-authorized task.
