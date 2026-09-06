# Reliability Design — u1-catalog-export-api

Diseña las soluciones concretas para `reliability-requirements.md`
(NFR-REL-1, NFR-REL-2) de este mismo Unit.

## Política de retry — lectura de imagen individual

Decisión confirmada en la entrevista (Q2): **1 retry con backoff de
200ms** antes de darse por vencido y loguear el warning (NFR-REL-1):

```python
# Pseudocódigo ilustrativo
async def read_image_with_retry(key: str) -> bytes | None:
    for attempt in range(2):  # intento original + 1 retry
        try:
            return await storage_port.get_object(key)
        except StorageReadError:
            if attempt == 0:
                await asyncio.sleep(0.2)
                continue
            log.warning("image_read_failed", product_id=..., image_key=key)
            return None
```

**Por qué 1 retry y no más**: un fallo transitorio de red suele
resolverse en el primer reintento; más reintentos agregarían latencia
acumulada (hasta 5000 imágenes potenciales) sin beneficio proporcional —
el comportamiento final (log + continuar) ya es la red de seguridad para
fallos persistentes (NFR-REL-1/BR4.2).

## Fallo sistémico del storage (NFR-REL-2)

Sin circuit breaker dedicado — dado el volumen y patrón de uso (un
export ocasional por dealer, no tráfico sostenido), un circuit breaker
agregaría complejidad sin beneficio real: cada llamada a `get_object()`
ya maneja su propio fallo de forma aislada (retry + log + continuar), sin
propagar el fallo de una imagen al resto del batch. Si el storage está
completamente caído, el resultado natural es que todas las imágenes
fallan individualmente (con su retry cada una) y el export igual
completa con CSV lleno + carpetas de imágenes vacías — comportamiento ya
aceptado en `reliability-requirements.md`.

## Health checks

Sin health check nuevo — el endpoint no introduce ninguna dependencia
nueva que monitorear aparte de lo ya cubierto por los health checks
existentes de la API y de DigitalOcean Spaces.

## Backup/failover

No aplica — sin dato nuevo persistido (Domain Design ADR-002).

## Fuente

Deriva de `reliability-requirements.md` (NFR-REL-1, NFR-REL-2) y
`rules.md` (Functional Design, BR4.2 — el comportamiento final que esta
política de retry precede).
