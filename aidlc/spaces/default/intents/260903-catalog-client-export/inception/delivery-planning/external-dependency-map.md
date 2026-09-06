# External Dependency Map — Export de catálogo

## Sin dependencias externas bloqueantes

Este intent es **totalmente contenido por el equipo/AI**, sin ninguna
dependencia externa que pueda retrasar el Bolt:

- **Sin dependencias nuevas de librería**: `csv`/`zipfile` (stdlib de
  Python) alcanzan; `boto3`/`httpx` ya están instalados si hace falta
  leer bytes de imágenes ya subidas (`requirements.md` § Constraints).
- **Sin APIs externas nuevas**: el flujo lee `Product`/`Organization` ya
  persistidos y `image_urls` ya subidas a DigitalOcean Spaces — no hay
  integración nueva con ningún servicio de terceros.
- **Sin integración con `facebook-auto-post`**: explícitamente fuera de
  alcance (`requirements.md` § Out of Scope) — el intent solo produce el
  archivo compatible, no automatiza su entrega a esa herramienta externa.
- **Sin aprobaciones de otro equipo**: no hay otro equipo humano
  involucrado (`team-allocation.md` — Team Formation SKIP, mob único de
  AI).
- **Sin ventana de disponibilidad de datos**: los datos que el export
  necesita (`Product.status=published`, `Product.image_urls`,
  `Organization.code`) ya existen y están disponibles en producción/
  staging hoy.

## Tabla (vacía por diseño)

| Dependency | Owner | Lead time | Blocks | Fallback if slips |
| ---------- | ----- | --------- | ------ | ----------------- |
| —          | —     | —         | —      | —                 |

No hay filas — este Bolt es 100% AI-contenido, consistente con
`team-allocation.md` (mob único, sin coordinación externa) y con
`requirements.md` § Constraints (sin dependencias nuevas).
