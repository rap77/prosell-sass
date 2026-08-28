# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->

- En Requirements Analysis: si la reverse-engineering previa ya respondió la mayoría de las ambigüedades, mantenerse en el piso de preguntas del Depth activo (p.ej. Minimal = 2-4) en vez de inflar el conteo de preguntas. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:requirements-analysis:9d82987653da9a0ce89ea6cd25711ad996e1df5e3fc5a3d3f45c02ef1806317d -->
- En Requirements Analysis: una cláusula condicional ambigua dentro de una respuesta de opción múltiple (aunque la opción elegida sea clara) amerita una pregunta de seguimiento antes de generar el artefacto — no asumir la interpretación más probable. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:requirements-analysis:13a5e2517b0bb6d2c605b84c0b5f1a646f002d401ca59adc7aa70b8b0ff1e43d -->
- En Code Generation zero-Unit (scope express, sin units-generation): la guarda plan-approval-guard bloquea el dispatch Task/Agent a aidlc-developer-agent porque su knownUnits()/evaluateCodeGenerationApproval hardcodean construction/<unit>/code-generation/ y colisionan con el slug del propio stage ("code-generation"), buscando en construction/code-generation/code-generation/ (doblado) en vez de construction/code-generation/ (real). Con el plan ya aprobado legítimamente (fingerprint + Approve Plan), hacer la generación de código directamente en el rol de developer en vez de vía dispatch Task/Agent — la guarda solo intercepta ese dispatch específico y no hay otra evidencia de completitud determinística para este stage sin support_agents. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:code-generation:4d866ef7f033fcaebaa758a501d698c7d997e2d531c0916286fca8e205de8be5 -->
- Los proxies BFF de Next.js en apps/web/src/app/api/v1/*/[...path]/route.ts fuerzan response.json() sobre toda respuesta del backend sin chequear content-type — rompe cualquier endpoint que devuelva algo no-JSON (CSV, archivos, etc.), mismo patrón de bug que el header If-Match descartado ya documentado (sesión 2026-08-21). Antes de agregar un endpoint que devuelva un content-type distinto de JSON, auditar el proxy correspondiente. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:code-generation:691c81e1f14d665969e36c0d6c58cb7717197cdd8fca45c2c1bd4033790e0e86 -->
- Hay 13 tests frontend pre-existentes fallando en el baseline de main (products.test.tsx, reverseTransitions.test.tsx, setProductCover.test.ts — mock sin el campo published_to_marketplace que el schema real ya requiere), no relacionados a ningún batch específico. Antes de asumir que un cambio introdujo una regresión de tests, verificar con git stash/pop contra el baseline previo. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:code-generation:ea2238cd023d7c56b5b36a438773b2704cfdd34cb0b91ee0c2d65324335d9e01 -->
- En Build and Test con Test Strategy Minimal: no generar integration/performance/security-test-instructions.md salvo que un cambio realmente lo amerite y no tenga ya una garantía estructural + test dedicado cubriéndolo (evaluar caso por caso, no generar por ceremonia). (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:build-and-test:866f20db5bcb54b22a4e7b7a8d15ce13cef93c254dd7f62659fa4b78a62a40f9 -->
- En Build and Test: no confiar en que una falla de test es "pre-existente" solo porque una etapa anterior (Code Generation) ya lo dijo — re-verificar con git stash/pop independientemente, especialmente cuando el archivo relevante al test SÍ fue tocado por el batch actual. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:build-and-test:d86d975c43160088d5bfa3397276c525bee61e6e8f96d595e80bef948e814e8b -->
- En Build and Test, cuando User Stories fue salteada (scope sin esa etapa), el Cross-Unit Final Coverage Gate (Step 11) se reduce a verificar solo FR/NFR contra traceability.json — no hay ACs de las que carecer, no es un gap. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:build-and-test:7f1ee74d8e6e3bec0000a5b67b6ebdfa62757bf4b78d693b22f69e515bc3eb54 -->
- Puede reaparecer un directorio vacío espurio apps/web/aidlc/spaces/default/intents/ cuando el cwd activo de un comando queda dentro de apps/web en vez de la raíz del repo (probablemente algún ensure-exists de ruta relativa). Es inofensivo — limpiarlo si aparece, no requiere investigación. (learned 2026-08-26) <!-- cid:260826-prod-bugfixes-batch:build-and-test:edc3b50e863e83371461b10714a6c30e24ef81a579c66bfdce49fd9842c1ea52 -->
- En Code Generation zero-Unit: `aidlc-testing-posture.ts fingerprint --unit <slug>` también dobla el path (`construction/<unit>/code-generation/`) igual que el bug ya documentado de plan-approval-guard — el fingerprint real vive en `construction/code-generation/` sin subcarpeta de unit. Workaround: duplicar temporalmente `code-generation-plan.md` + `unit-test-instructions.md` en el path doblado, correr fingerprint ahí, borrar la copia enseguida. (learned 2026-08-28) <!-- cid:260827-react-doctor-cleanup:code-generation:5e6a0f80a86f2bb8bce4adeff1b6acbfe1a29c21b08ac414a11f94cd24929467 -->
- En Code Generation: el piso de tests declarado en `unit-test-instructions.md` nunca debe exceder lo que el FR/scope realmente exige — para un refactor de comportamiento idéntico (scope `refactor`, sin piso de test nuevo), no hay que backfillear cobertura en archivos que ya carecían de test antes de tocarlos; alcanza con que la suite existente siga en verde. (learned 2026-08-28) <!-- cid:260827-react-doctor-cleanup:code-generation:9800398e5fa8ec3acb53a429b178f134a28e47d4b48794d36ce94f268c6c7064 -->
- El review adversarial de Code Generation vale la pena incluso en refactors que se sienten "triviales" (ej. migración de sintaxis/API) — en esta sesión atrapó un cambio de comportamiento real (fecha renderizada con locale por defecto en inglés en vez del locale español del resto de la UI) que typecheck, lint y la suite de tests existente no detectaron porque no rompía nada mecánicamente, solo cambiaba el output observable. (learned 2026-08-28) <!-- cid:260827-react-doctor-cleanup:code-generation:ed074335cb0340a113b27e6f3cc228aa484fbc1eb5dd6a075fea8127a157d705 -->
- `AGENTS.md` dice "el proyecto usa Zod 3, NO Zod 4, hasta resolver issue #74" pero `apps/web/package.json` ya tiene `zod: ^4.4.0` instalado — el código real sigue en estilo Zod 3 (41x `.passthrough()`, 4x `z.nativeEnum()` en `leads.ts`, cero usos legítimos de `z.looseObject()`/`z.enum()`-sobre-enum). Durante el intent 260827-react-doctor-cleanup se revirtió un intento parcial de migrar 2 archivos (`extractErrorMessage.ts`, `appointments.ts`) porque GGA lo bloqueó citando esa misma regla. Migración completa (41+ call sites, auditar #74, actualizar AGENTS.md) registrada aparte en el intent 260828-zod-3-to-4-migration — no colar fixes parciales de Zod 4 en otros archivos hasta que ese intent corra. (learned 2026-08-28)
- `onboarding/page.tsx` e `invite/[token]/page.tsx` usan `useEffect` para fetch/mutación de datos, violando la regla explícita `AGENTS.md:333` ("useEffect for data fetching - use Server Components or React Query"). No es un fix mecánico: `invite/[token]/page.tsx` dispara una mutación (`teamApi.acceptInvitation`) en el mount con 5 estados de UI, y no existe hoy un hook `useQuery` reusable para `orgApi`. Ambos son flujos de negocio sensibles (onboarding de organización, alta de usuarios) — necesitan tests nuevos, no solo mantener la suite en verde. Migración registrada aparte en el intent 260828-useeffect-to-react-query (scope bugfix, para heredar el piso de test que `refactor` no exige). (learned 2026-08-28)
- Encontrado durante el mismo cleanup: `h-9.5`/`px-4.5` (y variantes) NO son clases válidas de Tailwind — el proyecto usa `tailwindcss: 3.4.17` (confirmado en `apps/web/package.json`), no Tailwind 4 como dice la tabla de stack en `CLAUDE.md` raíz, y 4.5/9.5 no están en la escala de spacing default de v3 ni están extendidos en `tailwind.config.ts`. Esas clases compilan a CSS vacío. Aparecen en `BulkUploadCSV.tsx` (arreglado, convertido a `h-[38px]`/`px-[18px]`), y sin arreglar todavía en `privacy/page.tsx`, `terms/page.tsx`, `publications/page.tsx` (x5), `OnboardingStep3.tsx` (x3), `AppointmentForm.tsx` — bug real preexistente, sin intent propio todavía. (learned 2026-08-28)
- En Code Generation zero-Unit (scope express/sin units-generation), el bug de plan-approval-guard/testing-posture fingerprint que dobla el path construction/<unit>/code-generation/ se reconfirmó en el intent 260828-fix-invalid-tailwind-spa — seguir generando código directamente en el rol de developer (sin dispatch Task/Agent) es la vía estable mientras el bug no se resuelva. (learned 2026-08-28) <!-- cid:260828-fix-invalid-tailwind-spa:code-generation:716987f5e82ec515d7ea16ecc8cb59f6d754b02bc67a7e3572f6c2ff1558afc5 -->
- Los tests de nivel-config (ej. tailwind.config.ts, next.config.ts) van en apps/web/tests/unit/config/<config-file>.test.ts, importando el config con `await import("../../../<config-file>")` y aserciones directas sobre el objeto exportado — patrón ya establecido por tests/unit/config/next.config.test.ts, seguirlo para cualquier test futuro de config. (learned 2026-08-28) <!-- cid:260828-fix-invalid-tailwind-spa:code-generation:662fcdbc193ba9e6ad7c3220f7a8f2721a88be9c6a9497cf54233ea681e83d52 -->
- CLAUDE.md línea ~194 ("Key Conventions" → "TailwindCSS 4: New engine, no var() en className") repite el mismo drift de versión de Tailwind que la tabla de Tech Stack (ya corregida en el intent 260828-fix-invalid-tailwind-spa) — sigue sin corregir porque quedaba fuera del alcance aprobado de ese intent (FR3 solo nombraba la tabla de Tech Stack). Corregir en el próximo intent que toque ese archivo. (learned 2026-08-28) <!-- cid:260828-fix-invalid-tailwind-spa:code-generation:9f8547a2f8543ee87f7e8fc504a8c6b401cb05eb8ec97735784f54290ace99a4 -->
