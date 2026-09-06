# Security Design — u1-catalog-export-api

Diseña las soluciones concretas para `security-requirements.md` (NFR1.1,
NFR1.2, NFR2.1) de este mismo Unit. Sin diseño de autenticación/
autorización nuevo — reusa el mecanismo ya vigente descripto ahí.

## Autenticación y autorización

Reusa el middleware ya existente (`auth_middleware.py`,
`rbac_middleware.py`) sin cambio de diseño — el endpoint nuevo se agrega
al router `product_router.py` bajo la misma cadena de middleware que el
resto de `/api/v1/products/*`. `organization_id` se extrae del claim del
JWT ya decodificado por ese middleware (NFR1.1/NFR1.2) — sin lógica de
extracción nueva en el handler del endpoint.

## Prevención de zip-slip (NFR2.1)

Diseño concreto: reusar la función de sanitización ya existente
(`_slug_part()` en `csv_export.py`, o el equivalente probado
`_sanitize_filename` de `CSVImageMapper`) como única vía para construir
cada segmento del nombre de carpeta/archivo dentro del ZIP:

```python
# Pseudocódigo ilustrativo
folder_name = "/".join(
    _slug_part(segment) for segment in [org_code, year_make_model_etc]
)
```

Ningún segmento se concatena directo desde un atributo de producto sin
pasar por `_slug_part()` — la garantía es a nivel de función única de
entrada, no de revisión caso por caso.

## Input validation

Sin validación de input nueva — el endpoint no acepta query params ni
body (`contract-summary.md`), por lo que no hay superficie de input a
validar más allá de la ya cubierta por el middleware de auth.

## Manejo de secretos

Las credenciales de `boto3`/DigitalOcean Spaces ya están gestionadas vía
variables de entorno/secrets manager existente — sin secreto nuevo que
introducir para el método `get_object()` agregado en Functional Design
(reusa la misma configuración de cliente S3 ya usada por `upload`/
`presign`/`delete`/`exists`).

## Headers de seguridad

Sin header nuevo específico de este endpoint — hereda los headers de
seguridad ya configurados a nivel de aplicación FastAPI (CORS, etc.),
sin necesidad de CSP/HSTS distinto para una respuesta binaria de
descarga.

## Datos en tránsito y exposición de datos en la respuesta

**NFR2.2 (datos en tránsito)**: TLS ya vigente a nivel de infraestructura
para todo el tráfico HTTP del sistema — sin diseño nuevo, sin
configuración distinta para este endpoint.

**NFR2.3 (datos expuestos en la respuesta)**: el ZIP no expone ningún
campo nuevo más allá de lo ya visible al vendedor autenticado en su
propio catálogo (`security-requirements.md`) — sin diseño de masking ni
filtrado adicional, la query de productos `published`/`organization_id`
(NFR1.2) ya acota el alcance de datos expuestos.

## Fuente

Deriva de `security-requirements.md` (NFR1.1, NFR1.2, NFR2.1, NFR2.2,
NFR2.3) y `functional-spec.md`/`contract-summary.md` para el punto exacto
del flujo donde cada control aplica.
