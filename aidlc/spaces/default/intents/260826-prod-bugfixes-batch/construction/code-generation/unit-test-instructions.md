# Unit Test Instructions — Batch de bugfixes de producción

## Estrategia: Minimal (scope `express`)

Requirement-driven: un test por requerimiento, piso de happy-path por componente. Aproximadamente 15-20 tests totales dado que el batch cubre 8 áreas funcionales en dos stacks (backend Python + frontend TypeScript). La suite existente debe permanecer en verde.

## Framework y comandos

### Backend (Python / pytest)

- Framework: pytest + pytest-asyncio (`asyncio_mode = auto`), pytest-cov.
- Comando runnable ANTES del primer test (verificado, no requiere bootstrap):
  ```bash
  cd apps/api && uv run pytest --version
  ```
- Comando de ejecución **acotado a este batch** (ajustar rutas exactas a medida que se crean los archivos de test en Grupos C/D/F):
  ```bash
  cd apps/api && uv run pytest tests/unit/test_public_product_router.py tests/unit/test_nhtsa_normalizer.py tests/unit/test_category_export.py -v
  ```
  (Nunca `uv run pytest` sin filtro — Build and Test corre esto por unidad y un comando sin acotar re-ejecutaría toda la suite.)

### Frontend (TypeScript / Vitest)

- Framework: Vitest + Testing Library + jsdom, `@vitest/coverage-v8`.
- Comando runnable ANTES del primer test (verificado):
  ```bash
  cd apps/web && pnpm vitest --version
  ```
- Comando de ejecución **acotado a este batch**:
  ```bash
  cd apps/web && pnpm vitest run src/components/admin/category-schema-editor.test.tsx src/components/forms/schema/SchemaFieldRenderer.test.tsx src/components/review/ReviewQueueTable.test.tsx src/components/public/ProductPublicView.test.tsx src/lib/utils/toTitleCase.test.ts
  ```

## Cobertura esperada por grupo (Minimal — 1 test por requerimiento + happy-path)

| Grupo | Requerimiento | Test                                                                            |
| ----- | ------------- | ------------------------------------------------------------------------------- |
| A     | FR3.1-FR3.3   | Schema unificado acepta `options`; `SchemaFieldRenderer` decide por `render_as` |
| A     | FR3.4         | `CategorySchemaEditor` refleja valor seleccionado en Type/Group                 |
| B     | FR1.1, FR2.1  | Thumbnail visible en cola de revisión y lista de publicaciones                  |
| C     | FR5.1, FR5.2  | `get_public_product` incluye nombre+dirección, nunca teléfono                   |
| C     | FR5.3         | Link de WhatsApp con destinatario y mensaje correcto                            |
| D     | FR6.1, FR6.2  | `toTitleCase()` unitario + normalizadores backend en Title Case                 |
| E     | FR7.1         | Labels de formulario de vehículos en español                                    |
| F     | FR8.2         | Orden de columnas estable entre importador y exportador                         |
| F     | FR8.4         | Generador de nombre de carpeta de imágenes                                      |
| F     | FR8.1, FR8.5  | CSV exportado con columna de ruta de imágenes                                   |

## Mocking / stubbing

- Backend: mockear el repositorio de organización/contactos en los tests de `public_product_router` (no pegar contra Postgres real). Mockear el servicio NHTSA en tests de normalización.
- Frontend: mockear el cliente API (MSW o mocks manuales existentes en `apps/web/tests/__mocks__/`) para los tests de componentes que dependen de datos de producto/contacto.

## Test data

- Reusar fixtures/factories existentes donde ya existan (ej. product factories en `apps/api/tests/utils/`, mocks de producto en `apps/web/tests/__mocks__/`) en vez de crear nuevas si el shape ya cubre lo necesario.

## Cobertura objetivo

- No se agrega un piso de coverage nuevo (scope `express` no lo requiere) — mantener el piso actual del proyecto (40% líneas/funciones, 75% branches en frontend per `vitest.config.ts`) sin regresión.
