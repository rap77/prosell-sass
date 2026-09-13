# Reliability Design — u1-cross-org-export-api

Diseña las soluciones concretas para `reliability-requirements.md`
(NFR-REL-1, NFR-REL-2, NFR-REL-3) de este mismo Unit. Extiende sin
cambio el diseño ya aprobado en `260903-catalog-client-export`.

## Política de retry — lectura de imagen individual (sin cambio)

1 retry con backoff de 200ms antes de loguear el warning y continuar
(NFR-REL-1) — mismo diseño ya aprobado, sin cambio: el volumen techo no
cambia en este intent.

```python
# Pseudocódigo ilustrativo
async def read_image_with_retry(key: str) -> bytes | None:
    for attempt in range(2):
        try:
            return await storage_port.get_object(key)
        except StorageReadError:
            if attempt == 0:
                await asyncio.sleep(0.2)
                continue
            log.warning("catalog_export.image_read_failed", extra={"image_key": key})
            return None
```

## Fallo sistémico del storage (NFR-REL-2, sin cambio)

Sin circuit breaker dedicado — cada llamada a `get_object()` ya maneja
su propio fallo de forma aislada, sin propagar el fallo de una imagen
al resto del batch, en ambos modos.

## Riesgo residual de memoria a escala de plataforma (NUEVO, NFR-REL-3)

Sin mitigación de diseño nueva — riesgo ya ACEPTADO explícitamente
(`reliability-requirements.md`). El ZIP se arma completo en memoria
(patrón ya vigente, `StreamingResponse` empieza a enviar recién al
final), y el cap global (`scalability-design.md`) es el único control
de este riesgo. Sin diseño de streaming incremental ni de paginación en
este intent.

## Health checks (sin cambio)

Sin health check nuevo.

## Backup/failover (sin cambio)

No aplica.

## Fuente

Deriva de `reliability-requirements.md` (NFR-REL-1, NFR-REL-2, NFR-REL-3)
y `rules.md` (BR4.2, Functional Design).
