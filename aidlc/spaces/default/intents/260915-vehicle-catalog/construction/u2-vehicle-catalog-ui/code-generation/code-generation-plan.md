# Code Generation Plan — U2 (`u2-vehicle-catalog-ui`)

Basado en `functional-design/functional-spec.md`/`frontend-components.md`, `nfr-design/*.md`, `infrastructure-design/*.md`, `contract-summary.md` y `unit-of-work-story-map.md`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementar cada capa aplicable (backend: normalización de",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementar cada capa aplicable (backend: normalización de\n  VIN/dominio de categoría/casos de uso de import y migración; frontend:\n  `VinDecodeField`, `category-schema-editor`, formularios de vehículo) y\n  luego escribir y correr los tests de esa capa, sin backfillear cobertura en\n  código pre-existente no tocado por el cambio.\n- Piso de cobertura asimétrico ya aceptado (40% frontend, sin piso enforced en\n  backend) — no forzar simetría, per baseline.\n- CI corre la suite completa en cada push/PR; pre-push local corre\n  `pytest -q` (asimetría ya aceptada: no corre Vitest en pre-push).\n\n**Sin especialización de metodología, ordering ni piso general de\ncobertura** — el marco general (`classic`/`feature` → piso de 80% de\ncobertura de línea + ejecución en CI, per `org.md`) sigue vigente.\n\n**Candidato a piso mínimo de test NUEVO para ESTE INTENT (a confirmar en la\nentrevista, Step 4 — no afirmado todavía)**: dado que el hallazgo central\n#87 es una desalineación SILENCIOSA (sin ningún chequeo runtime que la\ndetecte), el riesgo real de un fix parcial es idéntico al ya aceptado en\n`260911-cross-org-export-ux` para bugs de valor-no-solo-de-clave:\n\n1. **Test de reconciliación cruzada entre los dos catálogos de valores de\n   Facebook** (`nhtsa_normalizer.NHTSA_TO_FACEBOOK` vs.\n   `facebook-values/index.ts`): para cada campo select-backed relevante de la\n   taxonomía de vehículos, el valor que produce el autocompletado de VIN debe\n   calzar con alguna `option` que el catálogo nuevo ofrece para ese mismo\n   campo — sin este test, una migración futura de uno de los dos catálogos\n   puede romper el otro en silencio, exactamente como describe el hallazgo\n   #87.\n2. **Test de `Category.validate_attributes()` contra el valor normalizado del\n   decode de VIN**, no solo contra valores tipeados a mano — hoy la\n   validación corre solo al guardar; confirmar si debe además rechazar (o\n   señalar) un autocompletado que no calza con ninguna `option` configurada.\n3. **Test de regresión de las migraciones legacy ad-hoc** (`20260812_0002_migrate_legacy_sedan_products.py`,\n   `20260625_0002_vehicle_vin_required.py`) si este intent las extiende o\n   generaliza — el hallazgo #92 documenta que hoy son puntuales por caso, sin\n   framework reutilizable; si Requirements Analysis decide generalizarlas,\n   necesitan tests de idempotencia/rollback nuevos que hoy no existen.\n4. **Test de wiring del `IPublisherService`/`PublisherStrategySelector`** si\n   este intent extiende el puerto para absorber la reconciliación de\n   catálogos (pregunta abierta del hallazgo #93) — confirmar que el contrato\n   existente (`playwright_publisher.py`, `graph_api_publisher.py`,\n   `null_graph_api_publisher.py`) sigue funcionando sin cambios de\n   comportamiento para los adapters que NO tocan este intent.\n\n**Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la\nentrevista: \"Sí, afirmar los 6 puntos tal cual\" — no cambia el piso general\ndel proyecto, solo aplica a la superficie nueva/tocada del catálogo canónico\nde vehículos de Facebook: reconciliación de catálogos de valores, mapeo de\nclaves de schema, tabla de traducción de categorías, y — condicionalmente —\nmigración legacy y contrato de adapter de publisher):**\n\n1. **Test de reconciliación cruzada valor-por-valor entre el catálogo de\n   decode de VIN (`nhtsa_normalizer.NHTSA_TO_FACEBOOK`) y el catálogo de\n   opciones del schema (`facebook-values/index.ts`)** — hallazgo central\n   #87. Mismo rigor ya exigido en el precedente `260911-cross-org-export-ux`\n   para `title_status`/`facebook_groups`: fijar un campo conocido (ej.\n   `body_type`), un valor de entrada conocido del catálogo A (`\"suv\"`) y\n   afirmar que existe una `option` exacta correspondiente en el catálogo B\n   para ese mismo campo — no alcanza con verificar que el campo tenga algún\n   valor. Verificado por developer que el mismatch no es solo idioma\n   inglés/español: ninguna de las tres representaciones de\n   `facebook-values/index.ts` (`key` en español, `es`, `en`) calza\n   carácter-a-carácter con los tokens que emite `NHTSA_TO_FACEBOOK`\n   (`\"gasoline\"`, `\"suv\"`, `\"FWD\"`) — hay discrepancias de casing incluso\n   dentro de la representación `en`. El test debe cubrir ese nivel de\n   granularidad (valor exacto, no solo idioma).\n2. **Test de `Category.validate_attributes()` contra un valor concreto\n   normalizado del decode de VIN, con input/output fijados — no un test de\n   humo.** Corrección de QA aplicada: la redacción original (\"confirmar si\n   debe además rechazar o señalar\") era una pregunta de diseño disfrazada de\n   ítem de piso, sin valor de entrada/salida concreto. Requirements Analysis\n   debe fijar primero el comportamiento exacto (¿rechaza con error, o\n   señala/loguea sin bloquear?) antes de que Build and Test pueda escribir\n   este test como una aserción ejecutable — mismo rigor exigido al punto 1\n   (input fijo → output exacto esperado), no solo confirmación de alcance.\n3. **Test de cobertura para la sincronización `FACEBOOK_FIELD_KEY_MAP`\n   (`category-schema-editor.tsx`) ↔ catálogo de valores\n   (`facebook-values/index.ts`)** — hallazgos #89/#91. Gap señalado por QA:\n   el draft original solo trataba esto como guía de implementación en §\n   Code Style, no como piso de test obligatorio, pese a que el propio scan\n   lo describe como \"el mismo patrón de riesgo estructural que #87, en\n   escala menor\" — aplicarle un criterio de severidad distinto (test\n   obligatorio para uno, solo nota de diseño para el otro) sería\n   inconsistente con el propio razonamiento usado para justificar el punto\n   1. Condicionado, igual que los puntos 5 y 6, a que Requirements Analysis\n   confirme que este intent toca esa capa de reconciliación.\n4. **Test dedicado para la tabla de traducción de categorías\n   (`CATEGORY_TRANSLATION_TABLE`)** — hallazgo #88 (hoy con una sola entrada\n   hardcodeada, cubierta solo indirectamente, sin test propio). Gap de\n   citación señalado por QA: el hallazgo #88 vive en la misma sección del\n   scan enfocado de este intent (`code-quality-assessment.md`, hallazgos\n   #87-93) y no había sido citado en el draft original pese a ser evidencia\n   directamente relevante para Testing Posture.\n5. **Test de regresión de las migraciones legacy ad-hoc**\n   (`20260812_0002_migrate_legacy_sedan_products.py`,\n   `20260625_0002_vehicle_vin_required.py`) — condicional a que este intent\n   las extienda o generalice (hallazgo #92, sin framework reutilizable hoy).\n6. **Test de wiring del `IPublisherService`/`PublisherStrategySelector`** —\n   condicional a que este intent extienda el puerto para absorber la\n   reconciliación de catálogos (pregunta abierta #93); debe confirmar que\n   los tres adapters concretos (`playwright_publisher.py`,\n   `graph_api_publisher.py`, `null_graph_api_publisher.py`) siguen\n   funcionando sin cambio de comportamiento para los que no toca este\n   intent.\n\n`csv_export.py`/`csv_field_mapper.py` (mapeo de valores) y\n`OrganizationPicker.test.tsx` (patrón de mocks frontend) siguen siendo los\nprecedentes reusables ya establecidos en intents previos para este tipo de\ntest de regresión de valor.\n\n**Gap heredado, no resuelto por este intent**: `docs/canonical/F01-bulk-upload-csv-import.md`\nsigue desactualizada respecto al CSV real del cliente (columna `option` vs.\n`description`, hallazgo #60) — fuera de alcance salvo que Requirements\nAnalysis decida corregir la doc como parte de este trabajo."
    },
    {
      "layer": "project",
      "text": "- En Build and Test, para un Unit kind: ui sin cruce de servicio/dominio, no generar integration-test-instructions.md cuando los tests de componente ya cubren la interacción real (fireEvent + verificación de efecto observable); tampoco generar performance-test-instructions.md ni security-test-instructions.md sin un NFR correspondiente en requirements.md. (learned 2026-08-30) \n\n- En Build and Test, con Test Strategy Minimal, no generar integration-test-instructions.md / performance-test-instructions.md / security-test-instructions.md cuando el intent no tiene NFR de performance/security y las FRs ya están cubiertas por regresiones de integración existentes — reconfirmado en el intent 260830-ci-seed-data. (learned 2026-08-30) \n- Para verificar NFR1.2 (suite completa de pytest backend) en Build and Test cuando no hay un Postgres de test corriendo: levantar un contenedor Docker temporal matching exacto de la config de CI (`postgres:17`, mismas credenciales/puerto que `postgres-test` en `ci.yml`), bootstrapear el schema con `create_test_schema.py`, correr la suite, y detener el contenedor al terminar. La convención ya aprendida de verificar con `git stash`/`pop` contra el baseline antes de asumir que una falla es \"pre-existente\" aplica también a la suite COMPLETA, no solo a los módulos tocados por el cambio. (learned 2026-08-30) \n\n- En Code Generation, correr vitest/tsc/eslint sobre los archivos efectivamente tocados en esa misma etapa (no solo diferir toda verificación a Build and Test) — atrapa bugs de implementación (ej. import incorrecto de un hook) antes del gate de aprobación, en vez de que aparezcan recién en la etapa siguiente. (learned 2026-09-01) \n\n- En Code Generation, al armar code-generation-questions.md, TODO el bloque de Plan Approval (resumen del plan, JSON del Testing Contract, [Approval Fingerprint], las dos opciones, y [Answer]) debe vivir bajo UN ÚNICO heading `## Plan Approval`, sin ningún sub-heading Markdown intermedio (ej. `## Testing Contract` como heading propio). El parser de `aidlc-testing-posture.ts` (`latestPlanApproval`) trackea la sección por heading: cualquier heading nuevo entre medio la cierra, y el fingerprint/[Answer] que quedan después de ese heading dejan de contarse como parte de \"Plan Approval\" — el plan-approval-guard bloquea el dispatch al developer-agent con el mensaje genérico de \"plan not fingerprinted and approved\", aunque el archivo tenga `[Answer]: Approve Plan` visualmente. Fix: usar texto en negrita (`**Testing Contract:**`) en vez de un heading `##` para subdividir visualmente el contenido dentro de la misma sección Plan Approval. (learned 2026-09-11) \n- En Code Generation (y cualquier stage con reviewer §12a sobre un `produces[]` artifact), cuando el reviewer agrega su propia sección `## Review` al artefacto primario (ej. `code-summary.md`), esa escritura — aunque sea la del propio reviewer, no una edición externa — invalida el fingerprint que `aidlc-log.ts review --verdict` valida contra el registrado en `REVIEW_REQUESTED`. Correr `aidlc-log.ts review --iteration <n> --retry-pending` (sin `--verdict`) INMEDIATAMENTE después de que el reviewer complete, para re-basear el fingerprint sobre los bytes actuales, y recién ahí registrar `--verdict READY|NOT-READY` — igual patrón ya documentado para ediciones humanas post-`## Review`, ahora confirmado también para la propia escritura del reviewer. (learned 2026-09-11) \n- En traceability.json (cualquier etapa de diseño o Code Generation), cuando una AC/FR/NFR está cubierta por código YA EXISTENTE que este Unit no toca (no por código nuevo), marcarla `status: \"OK\"` con el target apuntando al archivo/test pre-existente que la verifica — NO `status: \"N/A\"`. `N/A` se reserva para el caso distinto ya establecido (Unit kind `ui` sin `rules.md`/`BRx.y` que targetear, apuntando en su lugar a una sección de functional-spec.md). Mezclar ambos casos bajo `N/A` (como ocurrió con AC3.1.1 en el intent 260911-export-org-selector, donde `OrganizationPicker.tsx`/`OrganizationPicker.test.tsx` ya cubrían la AC sin cambios de este Unit) hace que el Cross-Unit Final Coverage Gate de Build and Test (que exige status `OK` literal) reporte un falso gap sobre una AC realmente cubierta. (learned 2026-09-11) \n\n- Cuando un requerimiento o una respuesta de entrevista cita un valor literal exacto de un archivo de referencia externo (ej. un formato de CSV de un cliente), re-verificar ese valor carácter a carácter contra el archivo real antes de propagarlo a `requirements.md`/artefactos posteriores — no confiar en la transcripción humana de memoria. Confirmado en el intent `260911-cross-org-export-ux`: el usuario citó `type=\"Auto/Camioneta\"` (mayúscula) como \"exacto como en data39.csv\", pero el valor real en el archivo es `Auto/camioneta` (minúscula) — una discrepancia de un solo carácter que, sin la re-verificación del reviewer contra el archivo real, se habría propagado a una tabla de traducción de categorías y producido un CSV cliente final que no calza byte a byte con lo que el sistema externo del cliente espera. (learned 2026-09-12)"
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
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
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
  "input_sha256": "sha256:93b6aa3d38ae9200dbaf19214df9dcd70820b3c4aea6419a1d1c6e6907e42429",
  "contract_sha256": "sha256:0e8b9d1fea01ce975b308ef600453d447b5a81330082324fb97ef4b7f222b1c0"
}
```

**Layers aplicables a U2**: Frontend behavior (los 3 flujos). Data model/database, Repository/data access, API/endpoint no aplican como capas propias de este Unit (U2 consume contratos ya definidos por U1, sin lógica de API/dominio propia).

## Plan de implementación

- [ ] **Step 1**: Verificar el test runner existente. Comando exacto: `cd apps/web && pnpm vitest run tests/components/forms/SchemaFieldRenderer.test.tsx tests/components/admin/category-schema-editor.test.tsx tests/components/product/ProductLocationFields.test.tsx` (algunos son nuevos, se crean en los steps siguientes; usar los paths reales de test ya existentes para los componentes extendidos, no inventar convención nueva).

- [ ] **Step 2 — Frontend behavior (implementar, US1.1)**: Extender `DecodeVinResponseSchema` (`apps/web/src/lib/api/schemas/decodeVin.ts`) con `unmatched_fields: z.array(z.string()).default([])`; extender `useDecodeVin()` para no descartarlo; cambiar `VinDecodeFieldProps.onDecode` a `(decoded: DecodedVehicle, unmatchedFields: string[]) => void`; extender `mapDecodedToForm(decoded, schema, setValue, unmatchedFields)` para `setValue("_unmatchedFields", unmatchedFields)`; en el bloque `type: "select"` de `SchemaFieldRenderer.tsx`, `useWatch({control, name: "_unmatchedFields"})` para derivar `unmatched` y mostrar el ícono de ayuda "(i)" + texto "No se pudo autocompletar — completar a mano" (AC1.1.2, mecanismo completo ya especificado en `frontend-components.md`).

- [ ] **Step 3 — Frontend behavior (test, US1.1)**: extender el test existente de `SchemaFieldRenderer`/`VinDecodeField` (buscar el archivo real con `fd`/`rg`, no asumir el path) con casos: campo reconciliado no aparece en `unmatched_fields` (AC1.1.1), campo sin match muestra el ícono de ayuda (AC1.1.2).

- [ ] **Step 4 — Frontend behavior (implementar, US1.2)**: en `category-schema-editor.tsx`, para `row.key` en el vocabulario de vehículo (`make`, `fuel_type`, `transmission`, `body_type`, `drivetrain`, `wheelbase_type`, `bed_type`, `cab_type`, `electrification_level`), llamar a `GET /categories/facebook-values/{row.key}` (hook `useCanonicalFieldOptions`, patrón TanStack Query) en vez de `FACEBOOK_FIELD_KEY_MAP`/`facebook-values/index.ts` — fallback al input manual de "Options" si 404.

- [ ] **Step 5 — Frontend behavior (test, US1.2)**: test de `category-schema-editor.tsx` — options pobladas exactas desde el endpoint nuevo para un `row.key` de vehículo (AC1.2.1), fallback a manual si 404, sin cambio para `row.key` no-vehículo.

- [ ] **Step 6 — Frontend behavior (implementar, US2.1)**: `ProductLocationFields` (nuevo componente) — dos inputs (Ciudad, Provincia), badge "Heredado de organización" cuando ambos reflejan el default de organización, rechazo de par parcial antes de llamar al backend (AC2.1.1, AC2.1.2, AC2.1.4, AC2.1.5) — ver `interaction-spec.md`/`frontend-components.md` § 2 para el detalle completo.

- [ ] **Step 7 — Frontend behavior (test, US2.1)**: test de `ProductLocationFields` — persistencia de override completo, badge visible/oculto según estado, rechazo de par parcial, reversión a default en par vacío.

- [ ] **Step 8 — Documentación y trazabilidad**: `code-summary.md` + `traceability.json` de esta etapa.

## Test files (obligatorio)

- Extensión de tests existentes de `SchemaFieldRenderer.tsx`/`VinDecodeField.tsx`, `category-schema-editor.tsx`.
- `apps/web/tests/components/product/ProductLocationFields.test.tsx` (nuevo, si `ProductLocationFields` es un componente separado — confirmar ubicación real de tests de componentes de producto con `fd` antes de crear).

## Test configuration

Sin configuración nueva — mismo Vitest + Testing Library ya vigente.
