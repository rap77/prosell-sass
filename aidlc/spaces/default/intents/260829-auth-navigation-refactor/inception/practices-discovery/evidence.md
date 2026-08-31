# Evidence — Afirmado (Step 5, Lead Integration)

> Integra qué inspeccionó/infirió cada participante (lead + 3
> contribuciones ciegas), las decisiones de la entrevista humana, y la
> incertidumbre no resuelta remanente.

## Qué inspeccionó el lead (`aidlc-pipeline-deploy-agent`, Step 2)

Historia de git (`git log`/`git branch`, ~40 commits, merges), CI/CD
(`.github/workflows/ci.yml`, `deploy.yml`, `promote-prod.yml`,
`recover-prod.yml`), pre-commit/pre-push (`.pre-commit-config.yaml`,
`.gga`), Docker/deploy config (`docker/`), y los 6 artefactos de codekb ya
producidos por reverse-engineering (`technology-stack.md`,
`code-quality-assessment.md`, `architecture.md`, `business-overview.md`,
`dependencies.md`, `code-structure.md`). Regla de proyecto aplicada:
graphify no indexa historia de git ni config CI/CD, así que este pase usó
lectura directa por ser contenido no cubierto por el grafo AST.

Confirmó mecánicamente: trunk-based dev, Conventional Commits, CI con
gates reales antes de merge, deploy-on-merge a staging automatizado,
gate manual de producción vía `workflow_dispatch` + confirmación de texto,
health check post-deploy. Dejó como incertidumbre para la entrevista: la
estrategia de merge real (evidencia mixta), el uso de walking skeleton, la
tensión TDD-declarado-vs-test-after-real, y si el gate manual de
producción es permanente o temporal.

## Qué inspeccionó `aidlc-quality-agent` (Step 3, revisión ciega)

Verificó de forma independiente la configuración real de testing/CI
(`apps/web/vitest.config.ts` líneas 25-46, `ci.yml:89`,
`apps/api/pyproject.toml`). Confirmó con evidencia mecánica adicional que
la tensión "TDD estricto vs. test-after" es resoluble por evidencia antes
de la entrevista, no una incertidumbre real: `~/.claude/CLAUDE.md` es
configuración personal del usuario para el asistente (aplica a todas sus
sesiones/proyectos), no una afirmación de práctica de este equipo en este
repo; la evidencia del repo (threshold de cobertura rebajado con
justificación in-code tras medir cobertura ya escrita, ausencia total de
`--cov-fail-under` en el backend, aprendizajes ya persistidos en
`project.md` sobre no backfillear tests) es unánime en la dirección
test-after. Remarcó que la ausencia de piso de cobertura backend es total
(ni el 80% de `org.md` para `classic`, ni ningún otro número), más fuerte
de lo que el borrador del lead dejaba ver. Confirmó también que
`useOAuthPreload.ts`-adjacent (línea de test de `LoginPageContent`/
`RegisterPageContent`) carece de cobertura sobre el handler OAuth
duplicado que este intent probablemente toca.

## Qué inspeccionó `aidlc-developer-agent` (Step 3, revisión ciega)

Usó `graphify query` (Paso 0 mandatorio) sobre el grafo AST existente,
cruzado con `code-structure.md`/`architecture.md` del codekb — sin releer
código fuente de aplicación directamente en este pase. Confirmó el patrón
backend de manejo de errores por dominio (`<Dominio>DomainException` +
handler centralizado `auth_domain_exception_handler()`) como convención
sólida y nombrable, y señaló la ausencia de un equivalente en el frontend
para la navegación auth que este intent toca. Identificó 3 hallazgos
concretos del área del intent: (1) duplicación literal del redirect OAuth
entre `LoginPageContent.tsx` y `RegisterPageContent.tsx` (4
`eslint-disable` idénticos); (2) `useOAuthPreload.ts` como código muerto
con test propio que ejercita un import inexistente
(`@/components/auth/OAuthButtons`), un falso positivo de cobertura; (3)
drift de naming — `proxy.ts` fue renombrado desde `middleware.ts` pero el
JSDoc de cabecera sigue diciendo "Next.js Middleware". Confirmó
`deriveRole.ts` como patrón positivo a preservar (single source of truth
de rol compartido server/client).

## Qué inspeccionó `aidlc-devsecops-agent` (Step 3, revisión ciega)

Revisó `.pre-commit-config.yaml`, `.gga`, `.github/workflows/*.yml`,
`.github/dependabot.yml` y `code-quality-assessment.md`, con foco
exclusivo en lint/format enforcement, SAST/DAST, secret + dependency
scanning, y supply-chain. Confirmó lint/format y el mandato de pipeline
pre-commit completo como bien fundamentados. Señaló cinco gaps que el
borrador del lead no distinguía explícitamente: (1) GGA es un revisor de
IA contra convenciones de estilo/arquitectura, NO un SAST real (sin
CodeQL/Semgrep/Bandit en ningún workflow); (2) ausencia total de DAST
contra staging pese a que `deploy.yml` publica ahí en cada merge; (3)
secret-scanning es un script custom liviano ("gitleaks-style", sin red,
el propio comentario del archivo recomienda instalar gitleaks aparte),
sin backstop en CI ni escaneo de historial; (4) `dependabot.yml` cubre
exclusivamente el ecosistema `github-actions` — sin ningún escaneo de CVEs
para npm/pnpm (`apps/web`) ni Python/uv (`apps/api`); (5) asimetría de
supply-chain: `appleboy/ssh-action` pineada por SHA completo en los
workflows con SSH a producción (mérito a preservar), mientras el resto de
Actions siguen pineadas por tag mutable.

## Decisiones de la entrevista humana (Step 4)

1. **Q1 — Estrategia de merge**: Squash-merge, afirmado explícitamente
   para el equipo en general (no solo para Bolts de AI-DLC).
2. **Q2 — Walking Skeleton**: No se corre esa ceremonia; se va directo a
   las features.
3. **Q3 — Piso de cobertura**: Se acepta tal cual la asimetría actual
   (40% frontend / sin piso backend) como práctica vigente.
4. **Q4 — Gates de lint pre-commit vs. CI**: La asimetría (`next-lint`
   solo CI, `react-doctor` bloqueante local) es intencional.
5. **Q5 — Gate manual de producción**: Permanente, salvaguarda intencional
   que se mantiene aunque el equipo crezca.
6. **Q6 — Manejo de errores en frontend**: Se adopta un patrón equivalente
   al del backend (`<Dominio>DomainException` + handler centralizado) como
   convención de equipo hacia adelante, no limitado a este intent.
7. **Q7 — Gaps de seguridad de pipeline**: Se registran como gaps
   conocidos y aceptados por ahora, sin bloquear el trabajo actual — sin
   SAST real, sin DAST, secret-scanning liviano solo local sin backstop en
   CI, y Dependabot sin cobertura de npm/pnpm ni Python/uv. Se atienden en
   un intent de seguridad dedicado más adelante. Esta decisión es
   explícitamente una **aceptación de gap conocido**, no una regla dura —
   por eso no aparece en `discovered-rules.md` § Mandated/Forbidden.

## Incertidumbre no resuelta

- Hallazgos de scope de código del área del intent (duplicación OAuth
  login/register, `useOAuthPreload.ts` como código muerto, drift de JSDoc
  `middleware.ts`→`proxy.ts`) quedaron señalados por
  `aidlc-developer-agent` pero **no fueron parte de las 7 preguntas de la
  entrevista de practices-discovery** — son candidatos de scope de
  _código_, no de _práctica de equipo_, y corresponde que Requirements
  Analysis/Code Generation los retome explícitamente para este intent, no
  que se resuelvan acá.
- El scan previo de reverse-engineering fue un **scan enfocado** en
  navegación auth/OAuth (no full rescan) — el resto del store de codekb
  queda marcado `kind: partial`, mecánico y esperado, no una regresión
  real de cobertura (aprendizaje ya registrado en `project.md`).
