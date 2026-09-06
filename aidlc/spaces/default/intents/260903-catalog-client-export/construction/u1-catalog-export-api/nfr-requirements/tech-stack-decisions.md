# Tech Stack Decisions — u1-catalog-export-api

`technology-stack.md` (codekb, scan enfocado `260903-catalog-client-export`)
ya confirma que **no se requiere ninguna dependencia nueva** para este
Unit — esta sección documenta la selección de las herramientas ya
instaladas que se usan, y por qué.

## Selecciones

| Categoría                      | Tecnología                                                      | Ya instalada               | Justificación                                                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serialización CSV              | `csv` (stdlib Python)                                           | Sí                         | Ya usado en el flujo de import equivalente (`csv_field_mapper.py`); sin necesidad de una librería de terceros para 24 columnas con separador fijo.                                                  |
| Armado de ZIP                  | `zipfile` (stdlib Python)                                       | Sí                         | Mismo criterio — sin necesidad de terceros para un ZIP simple sin compresión especial.                                                                                                              |
| Lectura de imágenes ya subidas | `boto3` (vía nuevo método `get_object()` en `IDOSpacesService`) | Sí (`>=1.35.0`)            | Decisión de Functional Design (Q1) — agregar el método al puerto existente en vez de usar `httpx` contra URLs públicas, para no depender de que las `image_urls` sean accesibles sin autenticación. |
| Framework web / routing        | FastAPI                                                         | Sí (`[standard]==0.128.0`) | Endpoint nuevo dentro del router ya existente (`product_router.py`), sin cambio de framework.                                                                                                       |
| Validación de errores tipados  | Pydantic + jerarquía `ProductError`                             | Sí (`==2.12.5`)            | Sigue la convención ya vigente del dominio Product (`rules.md` BR4.3).                                                                                                                              |

## Descartado explícitamente

- **`httpx` directo contra `image_urls` públicas**: opción evaluada y
  descartada en Functional Design (Q1) a favor de `get_object()` — el
  humano priorizó no depender de accesibilidad pública de las URLs por
  sobre la simplicidad de no tocar el puerto.
- **Librería de terceros para CSV/ZIP** (ej. `pandas`, `py7zr`): sin
  justificación — el stdlib de Python ya cubre el caso de uso completo
  sin la sobrecarga de una dependencia nueva.

## Sin cambios de infraestructura

Sin necesidad de Redis/Taskiq (operación síncrona, sin tarea en
background) ni de ningún componente de infraestructura nuevo — el
endpoint vive enteramente dentro del servicio FastAPI ya desplegado.
