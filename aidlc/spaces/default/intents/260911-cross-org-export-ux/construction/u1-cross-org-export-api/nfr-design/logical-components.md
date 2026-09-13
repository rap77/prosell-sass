# Logical Components — u1-cross-org-export-api

Puente entre las decisiones de NFR Design y la próxima etapa
(Infrastructure Design) — vista a nivel de componente lógico de dónde
aplican los patrones NFR diseñados arriba. Extiende el inventario ya
aprobado en `260903-catalog-client-export` con los componentes nuevos
de este intent.

## Inventario de componentes lógicos

| Componente lógico                                                  | Ubicación (capa)                                  | Responsabilidad                                                                                                                                                        | Nuevo/Extendido                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `csv_export.py` (extensión)                                        | `domain/services/`                                | Mapeo de columnas corregido (BR1.1-BR1.6, BR1.8), resolución vertical→cliente, construcción de `path`                                                                  | Extendido (fix de mapeo + FR8.4)                                       |
| `category_translation.py` (nuevo)                                  | `domain/services/` o `domain/entities/`           | Diccionario estático `{vertical_category_id: CategoryTranslationEntry}` — sin ciclo de vida propio                                                                     | Nuevo (dict estático en código, decisión de `tech-stack-decisions.md`) |
| Use case de export (extensión)                                     | `application/use_cases/`                          | Orquesta: query (con/sin filtro de tenant), cap global/por-org, resolución batch de `org_code`, cache de vertical, lectura concurrente de imágenes, ensamblado del ZIP | Extendido (nueva rama `all_organizations`)                             |
| Resolución batch de `org_code` (nuevo helper)                      | `application/use_cases/` (helper interno)         | `{organization_id: org_code}` pre-resuelto antes del loop — mismo patrón que `_resolve_org_codes()`                                                                    | Nuevo (helper, reusa `OrganizationRepository` ya existente)            |
| `IDOSpacesService.get_object()` (sin cambio)                       | `application/ports/` + `infrastructure/services/` | Lectura de bytes de imagen ya subida                                                                                                                                   | Sin cambio (ya agregado en `260903`)                                   |
| Endpoint de export (extensión)                                     | `infrastructure/api/routers/product_router.py`    | Acepta `all_organizations`/`base_folder`/`facebook_groups_fallback`, delega al use case extendido                                                                      | Extendido                                                              |
| `_check_org_scope_permission()` (extensión)                        | `infrastructure/api/routers/` o `application/`    | Acepta el flag `all_organizations` además de `organization_id` puntual                                                                                                 | Extendido                                                              |
| `ExportLimitExceededError`, `EmptyCatalogExportError` (sin cambio) | `domain/exceptions/product_exceptions.py`         | Errores tipados del flujo, reusados en ambos modos                                                                                                                     | Sin cambio                                                             |

## Failure domains (sin cambio de topología)

Un único failure domain: la request HTTP individual — sin estado
compartido entre requests concurrentes de export, en ambos modos.

## Blast radius

- **Fallo de imagen individual**: acotado a esa imagen (sin cambio).
- **Fallo del chequeo de permiso** (`_check_org_scope_permission()`
  extendido): en modo "todas", el radio de explosión de un fallo de
  este control es mayor (expone la plataforma completa en vez de una
  organización) — ya documentado explícitamente en
  `security-requirements.md` § Radio de explosión, sin diseño de
  mitigación adicional más allá de lo ya decidido (auditoría
  distinguible + confirmación de UI reforzada, ambas fuera de este
  Unit de backend salvo el logging).
- **Cap excedido**: acotado a esa request, en ambos modos — sin efecto
  en otras requests concurrentes.

## Aislamiento de componentes (sin cambio)

Ningún componente nuevo requiere aislamiento de infraestructura
adicional — `category_translation.py` es un módulo Python puro (dict
estático), sin proceso ni tabla nueva.

## Recurso compartido identificado (sin cambio)

El pool de conexiones HTTP hacia DigitalOcean Spaces sigue siendo el
único recurso compartido relevante — el semáforo de 20 (sin cambio) lo
sigue protegiendo, en ambos modos.

## Fuente

Deriva de `functional-spec.md`, `rules.md` (Functional Design de este
Unit) y de los 6 artefactos anteriores de esta etapa.
