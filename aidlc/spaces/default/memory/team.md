# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- Trunk-based development, ramas de feature de corta duración con prefijos
  convencionales (`fix/`, `feat/`, `chore/`, `refactor/`, `test/`), todas
  apuntando a `main` como única rama larga.
- Convención de nombre de rama: `<tipo>/<slug-descriptivo-en-inglés>`, sin
  número de ticket/issue.
- **Estrategia de merge: Squash-merge** (afirmado Q1 en 260829) — cada
  branch se aplasta a un solo commit en `main`.
- Mensajes de commit: **Conventional Commits** estricto (`fix(scope):`,
  `feat(scope):`, `chore(scope):`, `refactor(scope):`, `docs(scope):`,
  `test(scope):`).
- Los commits `chore(aidlc): ...` documentan el propio ciclo de vida del
  framework AI-DLC como parte normal del historial de `main`.
- Sin especialización nueva para este intent (confirmado por el lead y las
  tres revisiones ciegas sin objeción): el feature de export es una
  adición de código dentro de un Unit existente (backend `product` +
  frontend catálogo), sin necesidad de rama ni convención distinta.

## Walking Skeleton

- **Afirmado (Q2 en 260829): no se corre la ceremonia de walking skeleton.**
  El equipo va directo a las features.
- Sin especialización nueva para este intent (confirmado por el lead y las
  tres revisiones ciegas sin objeción): el feature de export es
  autocontenido — las piezas (backend product, storage de imágenes, proxy
  Next.js) ya están conectadas y en producción, no requiere una porción
  end-to-end previa para "probar que las piezas conectan".

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementar la capa aplicable (backend o frontend según el
  cambio) y luego escribir y correr los tests de esa capa, sin backfillear
  cobertura en código pre-existente no tocado por el cambio.
- Asimetría de cobertura aceptada tal cual (Q3 en 260829): piso 40% frontend
  (`lines:40 functions:40 branches:75 statements:40` en `vitest.config.ts`),
  sin piso enforced en backend (`pytest --cov=prosell` sin
  `--cov-fail-under`). No forzar simetría.
- CI ejecuta la suite completa en cada push/PR a `main`; pre-push local
  corre `pytest -q` — gate de "suite completa en verde antes de merge" SÍ
  enforced mecánicamente.
- Asimetría de gates de lint intencional (Q4 en 260829): `next-lint`
  deshabilitado en pre-commit (solo CI); `react-doctor` bloqueante en
  pre-commit, advisory en CI.
- **Precedente de diseño de test para binarios/ZIP, con precisión de
  dirección**: el dominio ya tiene `CSVImageMapper`
  (`apps/api/src/prosell/domain/services/csv_image_mapper.py`) con tests
  unitarios dedicados a LEER estructuras ZIP que el cliente sube — sentido
  de IMPORT (`TestReadZipContents`, `TestZipStructureReading`,
  `TestBuildDoSpacesKey`, `TestSanitizeFilename`). Ese precedente cubre el
  sentido INVERSO al que este intent necesita: armar un ZIP para EXPORT.
  El **patrón de diseño de test transfiere** (unit test sobre la
  función/servicio, bytes-in/bytes-out en memoria, sin storage real), pero
  la **suite de casos es nueva** — no es "extender" una suite existente,
  es escribir una suite nueva sobre `csv_export.py` con esa misma
  filosofía (posición de calidad, confirmada sin objeción por developer y
  devsecops). Ya existe además un endpoint real de descarga de archivo
  (`download_bulk_upload_errors_csv()` en `product_router.py`,
  `StreamingResponse` con `text/csv`) que sirve de precedente directo de
  formato de respuesta para el nuevo endpoint de export.

- **Piso mínimo obligatorio de test para ESTE INTENT (Q1, afirmado en la
  entrevista) — no cambia el piso general del proyecto, solo aplica al
  feature de export CSV+ZIP:**
  1. Regresión explícita del bug ya confirmado en
     `build_image_folder_name()` (`csv_export.py`): hoy lee
     `attrs.get("color")` en vez de `attributes["exterior_color"]`, y el
     fallo es silencioso (sin excepción ni log). El caso de test debe usar
     la clave real (`exterior_color`), no solo `color`, para que la
     regresión quede cubierta permanentemente. El fix va en el archivo de
     test existente `apps/api/tests/unit/domain/services/test_csv_export.py`
     (patrón 1:1 ya establecido), no en uno nuevo. Antes de tocar la
     función, confirmar si es compartida con el endpoint de export
     genérico ya existente (`GET /api/v1/products/export.csv`, FEAT-1 de
     `260826-prod-bugfixes-batch`) y correr la suite completa relacionada
     a ese endpoint, no solo los tests nuevos.
  2. Casos límite explícitos de `Organization.code` para el segmento
     `{CÓDIGO_ORG}` del nombre de carpeta: código de 1 carácter, código de
     5 caracteres, y código ausente (`None`) — `Organization.code` es
     `str | None` de 1 a 5 caracteres, no fijo en 2 como sugiere el
     ejemplo feliz de `docs/data39.csv`. No alcanza con un solo caso feliz.
  3. Test de contrato para `Content-Type`/`Content-Disposition` del nuevo
     endpoint de export — el repo ya tuvo dos bugs reales confirmados de
     "proxy fuerza `.json()` sobre contenido no-JSON" en esta clase exacta
     de superficie (`project.md` learning 260826; `code-quality-assessment.md`
     #9 y #64). El proxy de `products`
     (`apps/web/src/app/api/v1/products/[...path]/route.ts`) ya está
     arreglado para esta ruta específica (confirmado por lectura directa:
     chequea `Content-Type`, hace `response.blob()` cuando no es JSON) —
     el test de contrato verifica que ese comportamiento correcto
     sobrevive el viaje completo proxy→browser para el endpoint nuevo, no
     que haya que arreglar nada de nuevo.

- **Gaps de cobertura/convención señalados por calidad, a resolver en
  Build and Test (no piso nuevo de equipo, documentados por trazabilidad)**:
  cero tests hoy para `handleExportCsv` (`catalog/page.tsx`) y
  `exportCatalogCsv` (`apps/web/src/lib/api/products.ts`) — es superficie
  de test nueva, no cobertura pre-existente a "mantener en verde". Además,
  `catalog/page.tsx` no calza limpio en ninguno de los dos patrones de
  ubicación de test ya vigentes (`tests/components/{module}/X.test.tsx` vs.
  co-located `page.test.tsx` de páginas admin) — Build and Test debe
  resolver cuál aplica antes de escribir los tests nuevos.
- **Duplicado de archivo de test sin resolver**: `test_csv_image_mapper.py`
  existe en dos ubicaciones (`tests/unit/services/` y
  `tests/unit/domain/services/`). Antes de usarlo como referencia de
  patrón o de extenderlo, Build and Test debe verificar cuál corre en CI.

## Deployment

- Deploy-on-merge a staging confirmado y automatizado (`deploy.yml`,
  `workflow_run` sobre `CI` verde en `main`), staging en runner
  self-hosted.
- **Gate manual de producción — permanente (Q5 en 260829)**:
  `promote-prod.yml` es `workflow_dispatch`-only con confirmación de texto
  exacto `"deploy"`.
- Workflow de recovery de emergencia (`recover-prod.yml`) sin rebuild.
- Notificaciones de deploy + health check post-deploy en producción.
- Postura de seguridad de pipeline con gaps aceptados y no bloqueantes
  (Q7 en 260829): sin SAST real, sin DAST, secret-scanning solo local,
  Dependabot solo `github-actions`. Devsecops confirma sin objeción que
  ninguno de los riesgos de este intent (zip-slip, DoS por memoria,
  tenant scoping) justifica por sí solo abrir el intent de seguridad
  dedicado ya diferido — son manejables en el diseño de este feature.
- Sin especialización nueva para este intent: el nuevo endpoint de export
  es un endpoint HTTP más dentro de la API existente, sigue el mismo camino
  de deploy que cualquier otro cambio de `apps/api`/`apps/web`. No cambia
  topología de entornos ni introduce un componente nuevo desplegable.

## Code Style

- Backend: Ruff (lint + format) + Pyright, en pre-commit y pre-push.
- Frontend: Prettier + ESLint flat config `--max-warnings=0` en CI, con la
  asimetría de gates ya documentada en Testing Posture.
- GGA (AI code review) bloqueante en pre-commit, primero en el orden de
  hooks, proveedor `codex`, `STRICT_MODE=true` — explícitamente NO un SAST.
- Naming: camelCase TS/JS, snake_case Python. Confirmado por evidencia
  (graphify + `code-structure.md`): la familia de servicios de dominio CSV
  sigue convención consistente (`csv_export.py`, `csv_product_parser.py`,
  `csv_image_mapper.py`, `csv_field_mapper.py`, todos bajo
  `domain/services/`, prefijo `csv_`). Cualquier módulo nuevo para el
  ensamblado del ZIP debe seguir esta misma familia de nombres (decisión
  de nombre específico queda para Functional Design).
- **Patrón de manejo de errores — adoptar en frontend hacia adelante
  (Q6 en 260829)**: excepciones tipadas por dominio + handler centralizado,
  igual que el patrón backend (`<Dominio>DomainException` + handler por
  dominio). Esta mandate es de ADOPCIÓN para el frontend porque ahí el
  patrón no existe — no aplica igual al backend, donde ya es la convención
  vigente.
- **Manejo de errores del export — backend (Q2, afirmado en la
  entrevista)**: `csv_export.py` hoy no lanza ninguna excepción propia (el
  bug de color pasa silencioso — exactamente el síntoma que
  `phases/construction.md` prohíbe, "silent failures are not acceptable").
  El backend ya tiene una jerarquía de excepciones tipada para el dominio
  Product — `ProductError` (clase base,
  `apps/api/src/prosell/domain/exceptions/product_exceptions.py`) con
  subclases específicas (`ProductNotFoundError`,
  `ProductInvalidStatusTransitionError`, `VehicleAlreadyExistsError`,
  etc.), mapeada a HTTP en `product_router.py`. El equipo confirmó: se
  **extiende `ProductError` con una subclase nueva** para los errores de
  export (p. ej. una imagen referenciada en `image_urls` que no se puede
  leer al armar el ZIP), en vez de crear una jerarquía separada tipo
  `CatalogExportException`. Mismo archivo, mismo patrón — para el backend
  esto es "seguir la convención ya vigente", no una práctica de equipo
  nueva a afirmar.
- Patrón positivo a preservar: `deriveRole.ts` como single source of truth
  de derivación de rol.
- **Layer boundary confirmado por evidencia (corrige imprecisión de
  `code-structure.md`)**: los puertos secundarios (`IDOSpacesService`, y
  cualquier puerto de storage) viven en `application/ports/`, NO en
  `domain/ports/`. Domain define solo `repositories/` (interfaces de
  persistencia) y mantiene zero-deps externas. Si la vía elegida para leer
  bytes de imágenes ya subidas es `httpx` contra `image_urls` públicas
  (alternativa a agregar `get_object()` al puerto S3), esa llamada HTTP NO
  puede vivir en `domain/services/` bajo ninguna circunstancia — debe
  separarse la lógica pura de nombrar la carpeta (dominio, ya existe) de
  la I/O de red/storage (application/infrastructure). Relevante para este
  intent porque condiciona dónde vive el código nuevo, pero la decisión
  específica (get_object vs. httpx) queda para Requirements/Functional
  Design.
- **Precedente de sanitización a reutilizar (seguridad + testing)**:
  `_slug_part()` (`domain/services/csv_export.py:26-37`) ya colapsa
  caracteres no-alfanuméricos (incluidos separadores de path) antes de
  construir nombres de carpeta; `_sanitize_filename` /
  `TestSanitizeFilename` en `CSVImageMapper` es el equivalente probado del
  otro lado. El código nuevo del ZIP de export DEBE reutilizar uno de
  estos sanitizadores para nombrar carpetas/archivos dentro del ZIP — no
  concatenar atributos de producto (`make`, `model`, `color`) sin pasar
  por sanitización, para no abrir una superficie de zip-slip.

## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
