**Collaborator:** aidlc-devsecops-agent

## Contribution

Revisé de forma independiente `.pre-commit-config.yaml`, `.gga`,
`.github/workflows/*.yml`, `.github/dependabot.yml` y
`code-quality-assessment.md`, con foco exclusivo en las cuatro áreas de mi
responsabilidad: lint/format enforcement, SAST/DAST, secret scanning +
dependency scanning, y controles de supply-chain. No repito lo ya cubierto
por lead/otros soportes en testing posture o deployment general — solo lo
que compete a seguridad de pipeline.

**Lint/format enforcement — confirmado, con el matiz correcto ya señalado
por el lead.** Ruff+Pyright (Python) y ESLint+Prettier (TS/JS) están
wireados en pre-commit/pre-push/CI. El hook `next-lint` está deshabilitado
(comentado) y `lint-staged` cubre solo archivos staged — el lead ya lo
documenta correctamente como gap parcial, no total (CI sí corre ESLint
completo). De acuerdo con esa lectura.

**SAST — ausencia real no señalada como tal en el borrador.** No hay ningún
SAST tradicional (CodeQL, Semgrep, Bandit, SonarQube) en ningún workflow ni
en pre-commit. Lo único que actúa como control de calidad/seguridad de
código es GGA (`codex`, `STRICT_MODE=true`, reglas de `AGENTS.md`) — un
revisor de IA contra convenciones de estilo/arquitectura, NO un analizador
estático de vulnerabilidades (no detecta injection, XSS, SSRF, deserialización
insegura, etc. de forma determinística). El borrador del lead no distingue
esto en ningún lugar de `team-practices.md`/`discovered-rules.md`: GGA queda
implícitamente tratado como si cubriera "seguridad", y no cubre SAST.

**DAST — ausencia total, sin mención en el borrador.** Cero evidencia de
DAST (OWASP ZAP, Burp, etc.) contra staging o cualquier ambiente. Dado que
`deploy.yml` sí despliega a staging automáticamente en cada merge a `main`,
hay una superficie corriendo donde un DAST podría engancharse y hoy no lo
hace. No es bloqueante para este intent (refactor de navegación auth
frontend), pero es un gap de postura de seguridad del equipo que la
entrevista/evidencia debería dejar registrado explícitamente como tal, no
solo omitido.

**Secret scanning — confirmado pero con matiz que el borrador no capta.**
El hook `no-secrets` (`scripts/verify-no-secrets.sh`) es explícitamente
"gitleaks-style" y liviano, sin red, y el propio comentario del archivo dice
"For deeper scanning, install gitleaks separately" — es decir, el propio
autor del hook documenta que NO es un reemplazo completo de gitleaks real.
Además solo corre en pre-commit (working tree/staged), sin backstop en CI
que re-escanee el historial completo de un push, y sin escaneo de commits
ya mergeados. El borrador del lead lo trata como "confirmado, sin evidencia
de bypass" sin mencionar que es un script custom liviano, no una
herramienta de secret-scanning con firmas mantenidas (gitleaks/trufflehog
reales tienen reglas actualizadas por terceros; un script propio no).

**Dependency scanning — gap crítico no mencionado en absoluto en el
borrador.** `dependabot.yml` cubre EXCLUSIVAMENTE el ecosistema
`github-actions` (actualiza pines de Actions semanalmente). No hay ninguna
entrada `package-ecosystem: npm` ni `package-ecosystem: pip`/`uv` — es
decir, las dependencias reales de la aplicación (paquetes de `apps/web` vía
pnpm, paquetes de `apps/api` vía uv) NO tienen ningún escaneo automatizado
de vulnerabilidades conocidas (CVE). No hay `pnpm audit`/`npm audit` en CI,
no hay `pip-audit`/`safety` en CI, no hay Snyk ni GitHub Advanced Security
Dependabot alerts configurados para esos ecosistemas. Esto es exactamente
el tipo de control que mi rol (`aidlc-devsecops-agent`) está mandatado a
evaluar y el borrador no lo toca ni como práctica confirmada ni como
pregunta pendiente — es una omisión, no una discrepancia de interpretación.

**Supply-chain — parcialmente confirmado, con un matiz de mérito real que
el borrador no resalta.** La acción `appleboy/ssh-action` está pineada por
SHA completo (`@0ff4204d...` con comentario `# v1.2.5`) en los dos workflows
que hacen SSH a producción (`promote-prod.yml`, `recover-prod.yml`) — buena
práctica de supply-chain security explícita, con Dependabot cubriendo la
actualización de ese pin. El resto de las Actions (`actions/checkout`,
`setup-node`, `pnpm/action-setup`, `setup-python`, etc.) están pineadas por
tag mutable (`@v6`, `@v5`), no por SHA — riesgo menor dado que son Actions
oficiales de GitHub/mantenedores reconocidos, pero es una asimetría de
postura (SHA-pin solo donde hay SSH a prod) que vale la pena que el equipo
afirme como decisión consciente y no como inconsistencia accidental.

## Positions

- AGREE: la descripción del lead sobre lint/format (Ruff/Pyright/ESLint,
  hook `next-lint` deshabilitado, CI como respaldo completo) es precisa y
  está bien fundamentada en evidencia mecánica — no tengo correcciones ahí.
- AGREE: el mandato "ALWAYS ejecutar el pipeline de pre-commit completo...
  antes de que un commit llegue a `main`" en `discovered-rules.md` está
  correctamente respaldado por `.pre-commit-config.yaml` y no requiere
  ampliación.
- OBJECT: el borrador no distingue GGA (revisor de IA contra convenciones)
  de un SAST real — no hay ningún analizador estático de seguridad
  (CodeQL/Semgrep/Bandit) en el pipeline, y esto debería quedar explícito en
  `evidence.md` como ausencia confirmada, no implícito bajo "code style".
- OBJECT: DAST está completamente ausente y no aparece mencionado ni como
  práctica ni como incertidumbre — dado que `deploy.yml` sí publica a
  staging automáticamente, es un gap de postura que merece registrarse
  explícitamente aunque no bloquee este intent.
- OBJECT: el hook de secret scanning es un script liviano custom (el propio
  comentario del archivo recomienda instalar gitleaks aparte para escaneo
  profundo) y solo corre en pre-commit local, sin backstop en CI ni escaneo
  de historial — el borrador lo presenta sin este matiz, como si fuera
  equivalente a una herramienta de secret-scanning mantenida.
- OBJECT: `dependabot.yml` solo cubre el ecosistema `github-actions` — NO
  hay escaneo automatizado de vulnerabilidades para las dependencias reales
  de la aplicación (npm/pnpm en `apps/web`, Python/uv en `apps/api`). Esto
  es una omisión total en el borrador (ni confirmado ni preguntado) y es
  exactamente el tipo de control de supply-chain que corresponde a mi rol
  señalar — recomiendo que se agregue como incertidumbre explícita para la
  entrevista (¿el equipo quiere `pnpm audit`/`pip-audit` en CI, o Dependabot
  extendido a `npm`/`pip`?), no que quede fuera del documento.
- OBJECT: el pineo por SHA de `appleboy/ssh-action` en los dos workflows con
  SSH a producción es un dato de mérito de supply-chain que el borrador no
  resalta como práctica ya existente y digna de mantenerse — vale la pena
  registrarlo en `team-practices.md` § Code Style o Deployment como
  evidencia positiva, junto con la asimetría frente al resto de Actions
  pineadas por tag.

## Subagent Summary: Practices Discovery (DevSecOps Review)

**Produced:**
`aidlc/spaces/default/intents/260829-auth-navigation-refactor/inception/practices-discovery/contributions/aidlc-devsecops-agent.md`

**Key Decisions:**

- Evalué el borrador del lead de forma ciega e independiente, sin coordinar
  con `aidlc-quality-agent` ni `aidlc-developer-agent`.
- Confirmé lint/format enforcement y el mandato de pipeline pre-commit
  completo como bien fundamentados por evidencia mecánica.
- Objeté cinco puntos: ausencia de SAST real (vs. GGA como sustituto
  informal), ausencia total de DAST, secret scanning como script liviano
  sin backstop en CI, ausencia total de dependency scanning para
  npm/pnpm/Python (Dependabot solo cubre `github-actions`), y una asimetría
  de supply-chain (SHA-pin solo en Actions con SSH a prod) que merece
  registrarse como decisión consciente.

**Issues/Concerns:**

- El gap de dependency scanning (npm/pip) es el hallazgo de mayor prioridad:
  no hay ningún mecanismo automatizado que detecte CVEs conocidos en las
  dependencias reales de la aplicación, y hoy no está ni siquiera nombrado
  como pregunta pendiente en la entrevista.
- SAST/DAST ausentes por completo — aceptable como postura actual de un
  equipo de una sola persona, pero debe quedar como decisión explícita del
  equipo, no como omisión silenciosa del documento de prácticas.

**Next Steps:**

- Sugiero que la entrevista (Step 4) incluya, aunque sea brevemente, una
  pregunta sobre si el equipo quiere agregar dependency scanning
  (`pnpm audit`/`pip-audit` en CI, o extender Dependabot a `npm`/`pip`) antes
  de afirmar `discovered-rules.md`/`team-practices.md` como completos en el
  área de seguridad de pipeline.
- No bloqueo la afirmación de las prácticas actuales — mis objeciones son
  gaps a documentar/decidir, no errores de hecho en lo que el lead sí
  confirmó.
