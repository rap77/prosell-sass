# Discovered Rules — Afirmado (Step 5, Lead Integration)

> Solo constraints humanos duros afirmados en la entrevista (Step 4) o
> confirmados sin ambigüedad por evidencia mecánica no en discusión. Los
> gaps de seguridad aceptados como conocidos (Q7) NO van acá — fueron
> aceptados como gap conocido, no como regla dura; ver `evidence.md`.

## Mandated

- ALWAYS usar Conventional Commits (`fix(scope):`, `feat(scope):`,
  `chore(scope):`, `refactor(scope):`, `docs(scope):`, `test(scope):`) —
  confirmado mecánicamente por el historial completo de `main`.
- ALWAYS squash-mergear las branches de feature a `main` (Q1, afirmado por
  el equipo) — cada branch se aplasta a un solo commit en `main`.
- ALWAYS ejecutar el pipeline de pre-commit completo (GGA → secret scan →
  spec-status → validate-tailwind → lint-staged → ruff/ruff-format →
  pyright → react-doctor → hooks estándar) antes de que un commit llegue a
  `main`.
- ALWAYS ejecutar la suite completa de pytest backend en pre-push y en CI
  (`test-python` job) antes de que un cambio llegue a `main`.
- ALWAYS requerir confirmación manual explícita (input de texto exacto
  `"deploy"`) para promover a producción, como salvaguarda permanente —
  afirmado en la entrevista (Q5) como política que se mantiene aunque el
  equipo crezca más allá de una sola persona, no como adaptación temporal.
- ALWAYS correr un smoke test / health check post-deploy en producción
  antes de considerar el deploy exitoso.
- ALWAYS adoptar en el frontend un patrón de manejo de errores equivalente
  al del backend (excepciones tipadas por dominio + manejo centralizado)
  como convención de equipo hacia adelante — afirmado en la entrevista
  (Q6), no limitado a este intent puntual.

## Forbidden

- NEVER usar `git commit --no-verify` para saltear el pipeline de
  pre-commit.
- NEVER agregar atribución de coautoría de IA (`Co-Authored-By`) a los
  commits.
- NEVER disparar el deploy de producción automáticamente sin acción manual
  explícita — `promote-prod.yml` no tiene ningún trigger `push`/`schedule`/
  `workflow_run`, solo `workflow_dispatch` con el input de confirmación.
- NEVER correr una ceremonia de walking skeleton (porción end-to-end
  mínima antes de las features) — afirmado en la entrevista (Q2); el
  equipo va directo a las features.
