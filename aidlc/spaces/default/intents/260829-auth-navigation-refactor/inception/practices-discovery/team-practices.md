# Team Practices — Afirmado (Step 5, Lead Integration)

> Integra el borrador del lead (Step 2), las tres revisiones ciegas de
> soporte (Step 3: quality, developer, devsecops) y las 7 respuestas de la
> entrevista humana (Step 4). Espeja las 5 secciones de `memory/team.md`.

## Way of Working

- Trunk-based development confirmado por evidencia: ramas de feature de
  corta duración con prefijos convencionales (`fix/`, `feat/`, `chore/`,
  `refactor/`, `test/`), todas apuntando a `main` como única rama larga.
- Convención de nombre de rama: `<tipo>/<slug-descriptivo-en-inglés>`, sin
  número de ticket/issue.
- **Estrategia de merge — afirmada (Q1): Squash-merge.** El historial
  mostraba evidencia mixta (merge commits tradicionales en épocas
  antiguas, patrón compatible con squash en runs recientes); el equipo
  confirmó explícitamente en la entrevista que la política es
  squash-merge — cada branch se aplasta a un solo commit en `main`. Esto
  coincide con el default ya afirmado por `org.md` para Bolts de AI-DLC, y
  ahora queda confirmado como práctica de equipo general, no solo del
  framework.
- Mensajes de commit: **Conventional Commits** estricto y consistente
  (`fix(scope):`, `feat(scope):`, `chore(scope):`, `refactor(scope):`,
  `docs(scope):`, `test(scope):`) — confirmado mecánicamente, sin
  necesidad de pregunta.
- Los commits `chore(aidlc): ...` documentan el propio ciclo de vida del
  framework AI-DLC (registrar intents, sincronizar audit log, refrescar
  codekb) como parte normal del historial de `main` — convención propia de
  este proyecto.

## Walking Skeleton

- **Afirmado (Q2): No corremos la ceremonia de walking skeleton.** El
  equipo confirmó explícitamente que no construye una porción mínima
  end-to-end antes de las features reales — va directo a las features. El
  patrón visible en el historial (`feat: merge Sprint 5-6...`,
  `feat(sprint-7): merge Phase 1...`) es de sprints/fases, no de skeleton
  técnico, consistente con esta respuesta.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementar la capa aplicable (backend o frontend según el
  cambio) y luego escribir y correr los tests de esa capa, sin
  backfillear cobertura en código pre-existente no tocado por el cambio.
- La distinción entre "Strict TDD Mode: enabled" (memoria global del
  usuario, configuración personal del asistente aplicable a todas sus
  sesiones y proyectos) y la práctica real de este equipo/repo
  (test-after) queda resuelta por evidencia, no por juicio en la
  entrevista: el threshold de cobertura frontend fue rebajado
  explícitamente después de medir cobertura ya escrita (patrón inverso a
  TDD), y los aprendizajes ya persistidos en `project.md` para Code
  Generation son explícitos y repetidos en esta dirección. La instrucción
  de `~/.claude/CLAUDE.md` queda fuera de alcance de esta práctica de
  equipo por ser config de asistente, no una afirmación de práctica de
  proyecto.
- **Asimetría de cobertura — aceptada tal cual (Q3).** El frontend tiene un
  piso de cobertura configurado en `vitest.config.ts`
  (`lines:40 functions:40 branches:75 statements:40`), rebajado
  deliberadamente de un objetivo original de 80% tras medir la cobertura
  real disponible. El backend **no tiene ningún piso de cobertura
  enforced** (`pytest --cov=prosell --cov-report=xml` en CI genera el
  reporte pero no pasa `--cov-fail-under`, y `apps/api/pyproject.toml` no
  declara `fail_under`) — es decir, la asimetría es total, no solo un
  matiz: ni el 80% que `org.md` fija como default para el scope `classic`
  activo, ni ningún otro número, aplican al backend hoy. El equipo eligió
  explícitamente aceptar esta asimetría (40% frontend / sin piso backend)
  como la práctica vigente, en vez de subir el piso del frontend o de
  agregar uno nuevo al backend.
- CI ejecuta la suite completa en cada push/PR a `main` (`test-python`,
  `test-node` jobs), y el pre-push hook local corre `pytest -q` — el gate
  de "suite completa en verde antes de merge" SÍ está enforced
  mecánicamente, aunque el umbral de cobertura backend no lo esté.
- **Asimetría de gates de lint — intencional (Q4).** El hook `next-lint`
  (ESLint completo) está deshabilitado en pre-commit y solo corre en CI;
  `react-doctor`, en cambio, SÍ bloquea en pre-commit pero es solo
  advisory en CI (`react-doctor.yml` no bloquea merge). El equipo confirmó
  que esta dirección "invertida" es deliberada: ESLint completo es lento y
  se reserva para CI; `react-doctor` es rápido y vale la pena que bloquee
  localmente.
- Para el scope `classic` activo de este intent (refactor de navegación
  auth/frontend): el patrón de test correcto de cara a Build and Test es
  unit/component (Vitest + Testing Library) sobre el código de navegación
  tocado, no integración/E2E nuevo, consistente con el aprendizaje ya
  registrado de no generar artefactos de test por ceremonia cuando el
  cambio no lo amerita.

## Deployment

- **Deploy-on-merge a staging, confirmado y automatizado**: `deploy.yml`
  se dispara por `workflow_run` cuando `CI` termina exitoso en `main`
  (además de `workflow_dispatch` manual) — coincide con el default de
  `org.md`. Staging corre en un runner self-hosted (la PC local del
  usuario) — detalle de proyecto, no de equipo genérico.
- **Gate manual de producción — afirmado como permanente (Q5).**
  `promote-prod.yml` es `workflow_dispatch`-only, con un input de
  confirmación de texto exacto (`"deploy"`) como segundo seguro, sin
  aprobación de una segunda persona (equipo de una sola persona hoy). El
  equipo confirmó explícitamente que este gate manual queda como
  salvaguarda intencional de forma permanente, incluso si el equipo crece
  — no es una adaptación temporal que se reemplace por un approval de
  segunda persona más adelante.
- Existe un workflow adicional de **recovery de emergencia**
  (`recover-prod.yml`) para reiniciar contenedores ya buildeados sin
  rebuild cuando `promote-prod.yml` falla a mitad de camino.
- Notificaciones de deploy (staging y producción) vía webhook, y health
  check post-deploy en producción (`curl` con reintentos contra
  `/api/v1/health/`) — confirma la práctica de smoke test post-deploy que
  `phases/operation.md` mandata como guardrail de fase.
- **Postura de seguridad de pipeline — gaps aceptados, no bloqueantes
  (Q7).** El equipo confirmó que los siguientes gaps quedan registrados
  como conocidos y aceptados por ahora, sin bloquear el trabajo actual, a
  atenderse en un intent de seguridad dedicado más adelante: sin SAST real
  (GGA es un revisor de estilo/arquitectura con IA, no un analizador
  estático de vulnerabilidades — no detecta injection, XSS, SSRF,
  deserialización insegura de forma determinística); sin DAST contra
  staging pese a que se publica ahí en cada merge; secret-scanning liviano
  solo en pre-commit local (script custom "gitleaks-style" sin red, sin
  backstop en CI, sin escaneo de historial); y Dependabot cubriendo
  exclusivamente el ecosistema `github-actions` — sin ningún escaneo de
  CVEs para las dependencias reales de la app (npm/pnpm en `apps/web`,
  Python/uv en `apps/api`).
- Mérito de supply-chain a preservar: la acción `appleboy/ssh-action` está
  pineada por SHA completo en los dos workflows con SSH a producción
  (`promote-prod.yml`, `recover-prod.yml`) — buena práctica explícita,
  aunque el resto de las Actions siguen pineadas por tag mutable.

## Code Style

- **Backend (Python)**: Ruff (lint + format) y Pyright (type check),
  ejecutados en pre-commit y pre-push.
- **Frontend (TypeScript/JS)**: Prettier + ESLint flat config con
  `--max-warnings=0` en CI, con la asimetría de gates ya documentada en
  Testing Posture (`next-lint` deshabilitado localmente / solo CI;
  `react-doctor` bloqueante localmente / advisory en CI) — ambas
  intencionales por afirmación humana (Q4).
- **GGA (AI code review)** — bloqueante en pre-commit, primero en el
  orden de hooks, contra las reglas de `AGENTS.md`; proveedor `codex`,
  `STRICT_MODE=true`. Es un revisor de convenciones de estilo/arquitectura
  vía IA, explícitamente NO un SAST (ver Deployment § postura de
  seguridad).
- Naming: camelCase en TypeScript/JS, snake_case en Python — idiomático
  por lenguaje, sin regla de rename adicional.
- **Patrón de manejo de errores — adoptar en frontend como convención de
  equipo hacia adelante (Q6).** El backend tiene un patrón sólido y
  reutilizable por dominio: una clase base `<Dominio>DomainException`
  (`AuthDomainException`, `OrgDomainException`) con subclases específicas
  (`InvalidCredentialsException`, `UserNotFoundException`,
  `WeakPasswordException`, `Invalid2FACodeException`,
  `OAuthConfigurationError`), más un exception handler centralizado por
  dominio (`auth_domain_exception_handler()`) que mapea la jerarquía a
  respuestas HTTP. El frontend, en el área de navegación auth que este
  intent toca, no tiene un equivalente — no existe una taxonomía de error
  explícita (sesión expirada vs. credenciales inválidas vs. error de red)
  consistente entre `proxy.ts`, `authStore.ts` y `useAuth.ts`. El equipo
  confirmó que se adopta un patrón de manejo de errores equivalente al del
  backend (excepciones tipadas por dominio + manejo centralizado) en el
  frontend, como convención de equipo hacia adelante — no limitado a
  resolverse puntualmente en este intent.
- Patrón positivo a preservar: `deriveRole.ts` documentado explícitamente
  in-line como single source of truth de derivación de rol, compartido
  entre `proxy.ts` (server-side) y `authStore.ts` (client-side) — no
  duplicar durante refactors de navegación.
