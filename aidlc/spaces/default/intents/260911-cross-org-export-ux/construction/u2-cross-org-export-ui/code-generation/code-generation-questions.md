# Code Generation Questions — u2-cross-org-export-ui

## Plan Approval

Resumen del plan (`code-generation-plan.md`, 12 steps, metodología
test-after, Unit kind `ui` — solo Frontend behavior):

- **Estado global**: `organizationStore.viewingOrgId` extendido con
  sentinel `"ALL_ORGS"`.
- **Componente picker**: `OrganizationPicker.tsx` — label del sentinel
  `null` corregido ("mi organización", no "todos"), tercera opción
  "Todas las organizaciones" nueva, filtro por `product_count`.
- **Filtrado real de grilla**: `ProductFilters`/`useInfiniteProducts()`
  extendidos con `organization_id`; `catalog/page.tsx` deriva
  `organization_id` desde `viewingOrgId` per la regla `consumer_contract`
  de `contract-summary.md` (NUNCA omitido en el caso default).
- **Export extendido**: `exportCatalogClientFormat()` con nueva firma
  de objeto (`organizationId`, `allOrganizations`, `baseFolder`,
  `facebookGroupsFallback`); banner de confirmación con variante
  "todas las organizaciones" (conteo N); secuencia de 3 popups
  (archivo → carpeta base → grupos de Facebook), cualquier cancelación
  aborta todo el flujo.
- Sin dependencia nueva.

**Testing Contract:**

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar cada capa aplicable (backend: dominio/casos",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar cada capa aplicable (backend: dominio/casos\n  de uso/repositorio; frontend: componente/hook/página) y luego escribir\n  y correr los tests de esa capa, sin backfillear cobertura en código\n  pre-existente no tocado por el cambio.\n- Piso de cobertura asimétrico aceptado (40% frontend, sin piso enforced\n  en backend) — no forzar simetría.\n- CI corre la suite completa en cada push/PR; pre-push local corre\n  `pytest -q`.\n- Asimetría de gates de lint intencional (`next-lint` solo CI,\n  `react-doctor` bloqueante en pre-commit).\n\n**Sin especialización de metodología, ordering, piso general de\ncobertura ni gates de CI** — el marco general (`classic` → piso de 80%\nde cobertura de línea + ejecución en CI, per `org.md`) sigue vigente sin\ncambios.\n\n**Nota de cobertura CI cross-stack (observación de quality, no decisión\nnueva)**: `team.md` ya documenta la asimetría de que pre-push local solo\ncorre `pytest -q` (sin Vitest) — convención ya aceptada, mismo espíritu\nque la asimetría de gates de lint ya aceptada. Para este Bolt en\nparticular, que introduce dependencias reales cruzadas entre `apps/api`\ny `apps/web` (el filtrado de grilla depende de que el backend acepte\n`organization_id`; el sentinel \"todas\" depende de que el backend relaje\n`tenant_id`), la cobertura real cross-stack (ambos lenguajes, suite\ncompleta) ocurre recién en push/PR (CI), no en pre-push local. No es una\nespecialización nueva de proceso — es la aplicación tal cual de la\nconvención ya documentada, señalada acá para que quede explícito que el\ngate local no atrapa una regresión de Vitest introducida por este Bolt\nantes de que llegue a CI.\n\n**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la\nentrevista: \"Sí, afirmar los 6 puntos tal cual\" — no cambia el piso\ngeneral del proyecto, solo aplica a la superficie nueva de export\ncross-org \"todas las organizaciones\" + fix de mapeo de valores CSV +\nfiltrado real de grilla):**\n\n1. **Regresión de valor, no solo de clave, para `clean_title` y\n   `groups` en `build_client_format_row()`**: el bug real es de\n   TRANSFORMACIÓN DE VALOR (`title_status` string → `\"1\"`/`\"0\"` inverso\n   de `csv_field_mapper.py`; `facebook_groups: list[str]` →\n   `\",\".join()`), no de rename de clave — un test que solo verifique que\n   la columna existe y tiene ALGÚN valor no detectaría una inversión de\n   signo o un join incorrecto. El test debe fijar un valor de entrada\n   conocido (ej. `title_status=\"clean\"`, `facebook_groups=[\"A\",\"B\"]`) y\n   afirmar el valor de SALIDA exacto esperado por el formato cliente\n   (`\"1\"`, `\"A,B\"`), con un caso adicional para el valor inverso\n   (`title_status=\"rebuilt\"` → `\"0\"`, `facebook_groups=[]` → `\"\"`).\n   Justificación: impacto real de un bug no detectado es dato incorrecto\n   enviado a un sistema externo del cliente — mayor severidad que el\n   piso general de `classic` para un cambio de UI.\n2. **Regresión negativa explícita del comportamiento por defecto\n   post-sentinel**: después de introducir el sentinel \"todas las\n   organizaciones\", un test debe demostrar que el comportamiento por\n   defecto (sin pasar el sentinel, sin pasar `organization_id`) sigue\n   resolviendo a \"mi propia organización\", nunca a \"todas\" — blinda la\n   asimetría ya documentada (hallazgo #85) contra que se deslice hacia\n   el criterio de `list_products` por copiar el patrón sin querer.\n   Incluye además el caso ya afirmado en `260911-export-org-selector`:\n   un usuario SIN `ORG_ADMIN_VIEW_ALL` debe demostrar que (a) la opción\n   \"todas las organizaciones\" no está disponible en la UI, y (b) el use\n   case de export \"todas\" rechaza la llamada aun si se invoca\n   directamente sin pasar por la UI (defensa en profundidad, igual\n   criterio que `_check_org_scope_permission()` ya aplica al sentinel\n   puntual de una org ajena).\n3. **Test de la resolución de `org_code` por-producto**: dado un export\n   \"todas las organizaciones\" con productos de 2+ organizaciones\n   distintas, cada producto en el ZIP resultante debe aparecer en la\n   carpeta/segmento de SU PROPIA organización — no la de la primera\n   organización resuelta en el loop. Es la regresión directa del bug\n   real detectado en el scan (hallazgo #83 de `code-quality-assessment.md`).\n4. **Test de wiring del filtrado real de la grilla**: confirmar que\n   `organization_id` (derivado de `viewingOrgId`) efectivamente llega a\n   `useInfiniteProducts()`/`ProductFilters` y que cambiar de organización\n   en el picker dispara un refetch con el filtro nuevo — superficie de\n   test completamente nueva (hoy `viewingOrgId` solo alimenta el export,\n   nunca la query de productos).\n5. **Test del filtro del picker por `product_count`**: el nuevo\n   `.filter(o => (o.product_count ?? 0) > 0)` debe confirmarse con un\n   caso límite real — una organización con `product_count: 0` (o el\n   campo ausente, cubierto por `?? 0`) debe desaparecer de la lista.\n   Sin este test, un cambio futuro en `useOrganizations()`/\n   `OrganizationSchema` puede romper el filtro silenciosamente.\n6. **Test de wiring de los dos popups nuevos** (`window.prompt()` de\n   carpeta base y de grupos de Facebook): al menos un test por prompt\n   que confirme que un valor no-null ingresado llega al parámetro\n   correcto del llamado de export, y que `null` (cancelar) no dispara la\n   acción — misma categoría de \"superficie de test completamente nueva\"\n   que justifica el punto 4.\n\n`OrganizationPicker.test.tsx` y el patrón de mocks ya establecido\n(`useAuth`, `useOrganizations`, `useOrganizationStore`) siguen siendo el\nprecedente reusable para los puntos 2, 4, 5 y 6. Para los puntos 1 y 3\n(backend), el precedente reusable es la suite existente de\n`csv_export.py`/`csv_field_mapper.py` (mismo patrón de fixtures ya usado\npara el mapeo directo del import).\n\n**Gap heredado, no resuelto por este intent**: sigue sin resolverse\nformalmente cuál convención de ubicación de test aplica a\n`catalog/page.tsx` — este intent agrega tests nuevos en la misma zona\ngris ya documentada en `team.md`. Build and Test debe decidir\nexplícitamente antes de escribir los tests del filtrado de grilla, para\nno reabrir la ambigüedad una tercera vez sin decisión.\n\n**Precedente de implementación — resolución batch de `org_code`\npor-producto (Code Style, guía de implementación, no práctica de equipo\nnueva)**: el patrón exacto a seguir ya existe en producción en\n`apps/api/src/prosell/application/use_cases/product/bulk_upload_vehicles.py`\n— `_resolve_org_codes()` (línea 126) pre-resuelve TODOS los códigos de\norganización necesarios en una sola query batch antes del loop por fila,\ny el loop hace lookups O(1) contra ese dict (línea 171), nunca una query\npor fila dentro del loop. El caso del export \"todas\" es incluso más\nsimple de resolver con el mismo patrón (cada `Product` ya trae su propio\n`organization_id` como FK conocido, sin necesidad de matching de string\ncomo en el import): un batch `get_all_by_ids()`-style sobre las\norganizaciones distintas del lote de productos, construyendo un dict\n`{organization_id: org_code}` antes del loop de export. Functional\nDesign debe heredar este patrón directamente — no hace falta medir\nvolumen de organizaciones distintas para justificar el batch (como\nsugería una versión anterior de este documento); ya es el patrón elegido\npor el equipo para exactamente este tipo de problema en el flujo\nhermano (import).\n\n**Precedente de implementación — capas para la función de mapeo\nárbol-de-categorías → columnas planas del CSV (Code Style, guía de\nimplementación, no práctica de equipo nueva)**: `csv_export.py` hoy es\nun domain service con CERO dependencias externas (solo `re` y\n`collections.abc.Mapping`) — consistente con la regla de Clean\nArchitecture del proyecto (\"Domain layer has ZERO external\ndependencies\") y con el patrón ya usado por las funciones existentes del\narchivo, que siempre reciben datos YA RESUELTOS (nunca llaman a un\nrepositorio). La resolución `category_id → nodo del árbol` SÍ requiere\n`CategoryRepository.get_by_id_cross_tenant()` — esa llamada NO debe vivir\ndentro de `csv_export.py` (rompería su pureza de domain service), sino\nen la capa de use case (`export_catalog_client_format.py` o un helper que\neste invoque, que ya tiene acceso a repositorios inyectados), siguiendo\nel mismo patrón ya usado hoy para `org_code`/`Organization.code`\n(resuelto afuera, pasado ya resuelto adentro). El **mapeo puro** (nombres\nde nivel ya resueltos → 2 columnas planas `category`/`type`) sí puede\nvivir en `csv_export.py`, junto a `build_client_format_row()`, tomando\ncomo entrada datos ya resueltos — igual que hace hoy\n`build_image_folder_name()` con `Organization.code`. Functional Design\ndecide explícitamente esta separación resolución/mapeo, no la\nformulación de \"todo en el mismo archivo\" de una versión anterior de\neste documento."
    },
    {
      "layer": "project",
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30) \n\n- En Build and Test, con Test Strategy Minimal, no generar integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md cuando el intent no tiene NFR de performance/security y las FRs ya están cubiertas por regresiones de integración existentes — reconfirmado en el intent 260830-ci-seed-data. (learned 2026-08-30) \n- Para verificar NFR1.2 (suite completa de pytest backend) en Build and Test cuando no hay un Postgres de test corriendo: levantar un contenedor Docker temporal matching exacto de la config de CI (`postgres:17`, mismas credenciales/puerto que `postgres-test` en `ci.yml`), bootstrapear el schema con `create_test_schema.py`, correr la suite, y detener el contenedor al terminar. La convención ya aprendida de verificar con `git stash`/`pop` contra el baseline antes de asumir que una falla es \"pre-existente\" aplica también a la suite COMPLETA, no solo a los módulos tocados por el cambio. (learned 2026-08-30) \n\n- En Code Generation, correr vitest/tsc/eslint sobre los archivos efectivamente tocados en esa misma etapa (no solo diferir toda verificación a Build and Test) — atrapa bugs de implementación (ej. import incorrecto de un hook) antes del gate de aprobación, en vez de que aparezcan recién en la etapa siguiente. (learned 2026-09-01) \n\n- En Code Generation, al armar code-generation-questions.md, TODO el bloque de Plan Approval (resumen del plan, JSON del Testing Contract, [Approval Fingerprint], las dos opciones, y [Answer]) debe vivir bajo UN ÚNICO heading `## Plan Approval`, sin ningún sub-heading Markdown intermedio (ej. `## Testing Contract` como heading propio). El parser de `aidlc-testing-posture.ts` (`latestPlanApproval`) trackea la sección por heading: cualquier heading nuevo entre medio la cierra, y el fingerprint/[Answer] que quedan después de ese heading dejan de contarse como parte de \"Plan Approval\". Fix: usar texto en negrita (`**Testing Contract:**`) en vez de un heading `##` para subdividir visualmente el contenido dentro de la misma sección Plan Approval. (learned 2026-09-11) \n- En Code Generation (y cualquier stage con reviewer §12a sobre un `produces[]` artifact), cuando el reviewer agrega su propia sección `## Review` al artefacto primario, esa escritura invalida el fingerprint que `aidlc-log.ts review --verdict` valida contra el registrado en `REVIEW_REQUESTED`. Correr `aidlc-log.ts review --iteration <n> --retry-pending` (sin `--verdict`) INMEDIATAMENTE después de que el reviewer complete, para re-basear el fingerprint sobre los bytes actuales, y recién ahí registrar `--verdict READY|NOT-READY`. (learned 2026-09-11) \n- En traceability.json (cualquier etapa de diseño o Code Generation), cuando una AC/FR/NFR está cubierta por código YA EXISTENTE que este Unit no toca (no por código nuevo), marcarla `status: \"OK\"` con el target apuntando al archivo/test pre-existente que la verifica — NO `status: \"N/A\"`. (learned 2026-09-11) \n\n- Cuando un requerimiento o una respuesta de entrevista cita un valor literal exacto de un archivo de referencia externo (ej. un formato de CSV de un cliente), re-verificar ese valor carácter a carácter contra el archivo real antes de propagarlo a `requirements.md`/artefactos posteriores. (learned 2026-09-12)"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:61274b646ff3ecfe4c512ebfaaeec0cf0745e1a734b222e89fcaddcf3d5401e3",
  "contract_sha256": "sha256:9e6e54b591a4bb58fb5e272e1f4e7e6cb4c0eebba3a64030735d7b702cb69b51"
}
```

- "Approve Plan" — proceed to code generation
- "Request Changes" — revise the plan

[Approval Fingerprint]: sha256:90395dac99337372a02963580d7678eee84a296ffa9cedaad2279df0dbc69f97

[Answer]: Approve Plan
