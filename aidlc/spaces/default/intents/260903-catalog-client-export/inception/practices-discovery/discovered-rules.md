# Discovered Rules (Final — Step 5 Lead Integration)

> Re-run: reglas ya afirmadas en `aidlc/spaces/default/memory/project.md`
> (`## Mandated` / `## Forbidden`), re-confirmadas acá como vigentes para
> este intent. Ninguna restricción humana explícita y dura NUEVA fue
> identificada en la entrevista para el área de export CSV/ZIP — se listan
> abajo las ya vigentes por trazabilidad.
>
> **Nota de alcance**: la decisión de Q2 (extender `ProductError` con una
> subclase nueva en vez de una jerarquía separada para export) NO se
> promueve acá como `Mandated` de equipo — es una decisión de diseño de
> este feature específico (aplicación de una convención backend ya
> vigente, según confirmó developer sin objeción), no una restricción de
> proceso general. Queda registrada en `evidence.md` § Interview decisions
> para que Requirements/Functional Design la hereden.

## Mandated

- ALWAYS usar Conventional Commits (`fix(scope):`, `feat(scope):`,
  `chore(scope):`, `refactor(scope):`, `docs(scope):`, `test(scope):`).
- ALWAYS squash-mergear las branches de feature a `main`.
- ALWAYS ejecutar el pipeline de pre-commit completo (GGA → secret scan →
  spec-status → validate-tailwind → lint-staged → ruff/ruff-format →
  pyright → react-doctor → hooks estándar) antes de que un commit llegue a
  `main`.
- ALWAYS ejecutar la suite completa de pytest backend en pre-push y en CI
  (`test-python` job) antes de que un cambio llegue a `main`.
- ALWAYS requerir confirmación manual explícita (input de texto exacto
  `"deploy"`) para promover a producción.
- ALWAYS correr un smoke test / health check post-deploy en producción
  antes de considerar el deploy exitoso.
- ALWAYS adoptar en el frontend un patrón de manejo de errores equivalente
  al del backend (excepciones tipadas por dominio + manejo centralizado)
  como convención de equipo hacia adelante.

## Forbidden

- NEVER usar `git commit --no-verify` para saltear el pipeline de
  pre-commit.
- NEVER agregar atribución de coautoría de IA (`Co-Authored-By`) a los
  commits.
- NEVER disparar el deploy de producción automáticamente sin acción manual
  explícita.
- NEVER correr una ceremonia de walking skeleton antes de las features
  reales.
