# Contrato del adapter de Publisher (`IPublisherService`)

> Documentación de referencia (u1-vehicle-catalog-api, FR4.1) — sin cambios
> de código ni de comportamiento; los 3 adapters concretos siguen
> funcionando exactamente igual que antes de este documento.

## Propósito

`IPublisherService` (`apps/api/src/prosell/domain/ports/i_publisher_service.py`)
es el puerto (hexagonal) que las operaciones de negocio de publicación en
Facebook Marketplace consumen — nunca dependen de un adapter concreto.
Este documento fija el contrato del puerto y documenta explícitamente sus
3 adapters reales, para que cualquier código nuevo que envuelva/intercepte
sus llamadas herede las mismas obligaciones de manejo de credenciales que
los 3 adapters ya cumplen mecánicamente hoy.

## El puerto

```python
class IPublisherService(ABC):
    async def publish(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> str:
        """Devuelve el fb_listing_id de Facebook."""

    async def update(
        self,
        publication: Publication,
        access_token: str,
        image_bytes_list: list[bytes],
    ) -> None: ...

    async def delete(
        self,
        publication: Publication,
        access_token: str,
    ) -> None: ...
```

Tres métodos, misma firma de credencial (`access_token: str`) en los tres —
pero esa firma NO es una sola clase de credencial, ver la sección
siguiente.

## Los 3 adapters concretos

| Adapter                        | Archivo                                                                    | Estado                                                                                                     | Motor real                             |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `PlaywrightPublisherService`   | `apps/api/src/prosell/infrastructure/services/playwright_publisher.py`     | Phase 1 — publish/update/delete lanzan `NotImplementedError` (pendiente de credenciales FB reales en vivo) | Automatización de browser (Playwright) |
| `GraphAPIPublisherService`     | `apps/api/src/prosell/infrastructure/services/graph_api_publisher.py`      | Stub — requiere aprobación de Facebook App Review                                                          | Facebook Graph API                     |
| `NullGraphAPIPublisherService` | `apps/api/src/prosell/infrastructure/services/null_graph_api_publisher.py` | Null object — nunca se selecciona mientras `graph_api_approved=False`                                      | N/A (placeholder de tipo)              |

`PublisherStrategySelector` decide en runtime cuál de los tres instanciar
según `settings.graph_api_approved` (modo `auto`) o el motor forzado
explícitamente — un cambio al contrato del puerto afecta a los TRES
adapters simultáneamente, no a uno solo (team.md § Deployment ya afirma
esta verificación de equipo).

## Distinción crítica de credenciales — `access_token` NO es un token uniforme

El nombre del parámetro (`access_token: str`) es idéntico en los tres
adapters y en el puerto, pero el **alcance real de la credencial que
transporta es distinto**:

- **`PlaywrightPublisherService`**: según su propio docstring
  (`playwright_publisher.py:76`), `access_token` es en realidad
  **"Facebook session cookies JSON string (Phase 1)"** — una sesión de
  cookies robada permite actuar como el usuario completo de Facebook
  (todas las superficies de la cuenta), no solo sobre la Marketplace API.
  Es una credencial de **mayor alcance** que un token de página.
- **`GraphAPIPublisherService`**: `access_token` es un token OAuth de
  página de Facebook (Graph API), acotado a las operaciones de
  Marketplace que la app tiene permiso de hacer sobre esa página.

Código nuevo que envuelva o intercepte cualquiera de las tres llamadas
(`publish`/`update`/`delete`) hereda dos obligaciones que los tres
adapters ya cumplen mecánicamente hoy (nunca las violan porque ninguno
loguea ni serializa `access_token`), pero que NO son automáticas para
código nuevo:

1. **Nunca loguear `access_token` ni incluirlo en mensajes de excepción**
   — ni en logs de aplicación, ni en trazas de error, ni en payloads de
   auditoría.
2. **Tratar el `access_token` de Playwright y el de Graph API con el
   MISMO nivel de secreto**, aunque uno sea session cookies y el otro un
   token de página — código genérico que trate el parámetro solo por su
   firma (`str`) no debe asumir que siempre es de alcance acotado.

## Relación con el catálogo canónico de vehículos (u1-vehicle-catalog-api)

Este intent (260915-vehicle-catalog) reconcilia valores de atributo de
vehículo contra `FacebookVehicleValueCatalog`
(`apps/api/src/prosell/domain/services/facebook_vehicle_value_catalog.py`)
**antes** de que un vehículo llegue a publicarse — pero esa reconciliación
vive en la capa de decode-VIN/validación de categoría (`vehicle_router.py`,
`Category.validate_attributes()`), no en `IPublisherService` ni en
ninguno de sus 3 adapters. Este intent **no modifica el contrato del
puerto** ni el comportamiento de publish/update/delete — la pregunta
abierta que originó este documento (hallazgo #93,
`code-quality-assessment.md`: "¿el puerto de publisher absorbe la
reconciliación de catálogos?") se resuelve como **NO**: el puerto sigue
recibiendo atributos ya reconciliados/validados por capas anteriores, sin
cambio de firma ni de comportamiento para los tres adapters.

## Verificación (Code Generation, u1-vehicle-catalog-api)

La suite existente de los 3 adapters
(`tests/unit/infrastructure/test_graph_api_publisher.py`,
`tests/unit/infrastructure/test_publisher_strategy.py`) sigue en verde sin
ningún cambio de código en `i_publisher_service.py`,
`playwright_publisher.py`, `graph_api_publisher.py` ni
`null_graph_api_publisher.py` — este documento es puramente descriptivo
(FR4.1), no introduce comportamiento nuevo.
