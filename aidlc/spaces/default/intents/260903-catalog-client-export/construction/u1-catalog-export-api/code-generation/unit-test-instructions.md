# Unit Test Instructions — u1-catalog-export-api

## Framework y configuración

`pytest` (ya configurado, `apps/api/pyproject.toml`) — sin configuración
nueva. `pytest-asyncio` en modo `auto` para los tests async del use case
y del método nuevo del puerto de storage.

## Comando exacto (scoped a este Unit)

```bash
cd apps/api && uv run pytest tests/unit/services/test_csv_export.py tests/unit/services/test_do_spaces_service.py tests/unit/application/test_export_catalog_client_format.py tests/unit/domain/test_product_exceptions.py -q
```

Y para el endpoint (integración, requiere Postgres de test — ver
`project.md` learning sobre contenedor Docker temporal):

```bash
cd apps/api && uv run pytest tests/integration/api/routers/test_product_router_export_client_format.py -q
```

Nunca correr `pytest` sin filtro — cada comando de arriba está acotado a
los archivos de este Unit.

## Cobertura esperada (Test Strategy: standard, 5-8 tests por componente)

| Componente                                 | Tests | Casos clave                                                                                                                                                                         |
| ------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOSpacesService.get_object()`             | 5-6   | éxito, objeto inexistente, error de storage (boto3 `ClientError`)                                                                                                                   |
| `csv_export.py` (extensión)                | 6-8   | regresión del bug (`exterior_color`), `Organization.code` 1/5/None caracteres, `build_client_format_row` (option vacío, description poblado, orden de columnas)                     |
| `ExportCatalogClientFormatUseCase`         | 6-8   | catálogo vacío (404), cap excedido (413), imagen individual fallida (log warning, no aborta), ZIP bien formado, concurrencia acotada (mock del semáforo/gather no excede el límite) |
| `product_exceptions.py` (nuevas subclases) | 2     | `EmptyCatalogExportError`/`ExportLimitExceededError` heredan de `ProductError`                                                                                                      |
| Endpoint (integración)                     | 5-6   | 200 con Content-Type/Content-Disposition correctos, 404, 413, aislamiento multi-tenant (NFR1), organization_id nunca viene de un parámetro                                          |

Total estimado: 24-30 tests, dentro del rango "5-8 por componente" del
Testing Contract (5 componentes nuevos/extendidos).

## Mocking/stubbing

- `IDOSpacesService.get_object()`: mockeado en los tests del use case
  (no golpear DigitalOcean Spaces real). Tests del propio
  `DOSpacesService.get_object()` mockean el cliente `boto3` (mismo
  patrón ya usado para `upload_file`/`delete_file`).
- Repositorio de productos: mockeado/stub en los tests del use case
  (mismo patrón `StubProductRepository` ya visto en
  `test_create_lead_auto_assignment.py`, adaptado a `Product`).
- Tests de integración del endpoint: Postgres de test real (contenedor
  Docker temporal si no hay uno corriendo, per `project.md` learning),
  sin mockear la capa de persistencia — pero SÍ mockear
  `IDOSpacesService.get_object()` para no depender de storage real.

## Datos de test

Fixtures/factories ya existentes del dominio `Product`/`Organization`
(reusar los builders/factories ya vigentes en `apps/api/tests/` — no
crear un sistema de fixtures nuevo). Casos límite de `Organization.code`
requieren 3 instancias de organización con código de 1 char, 5 chars, y
`None`.
