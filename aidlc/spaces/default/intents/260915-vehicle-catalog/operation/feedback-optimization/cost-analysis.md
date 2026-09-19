# Cost Analysis — Intent 260915-vehicle-catalog

## Resumen

Sin AWS (sin Cost Explorer, sin Trusted Advisor, sin tagging de costo) —
el modelo de costo real de este proyecto es un droplet self-hosted de
costo fijo mensual, no un modelo pay-per-use por servicio.

## Costo incremental de este intent

**$0.** Verificado contra `infrastructure-specification.md` de ambas Units
(`u1-vehicle-catalog-api`, `u2-vehicle-catalog-ui`, ambos READY): "sin
cambio" en compute, networking, storage, ambientes ni IaC — mismos 6
contenedores Docker ya desplegados (`db`, `redis`, `api`, `worker`, `web`,
`caddy` en prod), sin recurso nuevo (base de datos, caché, cola, CDN, load
balancer). El footprint de memoria/CPU adicional (catálogo estático de 9
campos en memoria) es despreciable.

## Costo base de la infraestructura

**No relevado en esta etapa** (Q2b, confirmado por el humano: "no lo sé
con precisión ahora") — el costo mensual real del droplet y otros costos
fijos (dominio, backups externos si los hay) no se documenta acá para no
inventar un número. Si se necesita para reporting financiero, es un dato a
relevar directamente con el proveedor del droplet, fuera del alcance de
esta etapa.

## Oportunidades de optimización

Ninguna identificada — este intent no cambia el perfil de costo. Los
patrones de optimización de AWS (rightsizing, Savings Plans, S3 lifecycle,
Lambda tuning) de `cost-optimization-patterns.md` no aplican a un droplet
de costo fijo único.
