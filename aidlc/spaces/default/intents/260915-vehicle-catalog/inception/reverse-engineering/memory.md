<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->

> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations

<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-16T01:08:08Z — el veredicto NARROWER del overwrite backstop (Step 3) sobre las rutas del intent 260911-cross-org-export-ux era esperado (scan enfocado sobre un área distinta) — se mergeó aditivamente en vez de descartar, marcando ese conocimiento `[PRESERVADO ÍNTEGRO]` en los 9 artefactos finales, sin reabrir la pregunta al usuario.

## Tradeoffs

<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-16T01:08:08Z — el architect encontró un bug real (no de este proyecto, del propio tool del framework): `aidlc-utility.ts codekb-scope-diff --mint --paths <lista>` con 10+ pathspecs literales produce el hash de árbol vacío de git en vez del fingerprint real (reproducido en bash plano, git 2.55.0) — determinístico, así que el fingerprint sigue siendo auto-consistente para comparaciones futuras CURRENT/STALE sobre la misma lista de rutas, pero no es un hash de contenido genuino. Fuera de alcance de esta etapa arreglarlo; queda señalado para quien mantenga el framework AI-DLC (revisar `codekbScopeFingerprint()` en `.claude/tools/aidlc-lib.ts`).
- 2026-09-16T01:08:08Z — hallazgo central del scan (developer): dos catálogos de "valores de Facebook" incompatibles — `nhtsa_normalizer.py` normaliza el VIN decodificado a tokens en inglés/minúscula, mientras que el catálogo nuevo `facebook-values/index.ts` usa strings oficiales en español. `VinDecodeField.tsx` asume que ambos ya calzan para campos "select-backed" — desalineación silenciosa sin validación runtime. Esto debería ser una pregunta central de Requirements Analysis, no asumido resuelto acá.
