# Logical Components — U2 (`u2-vehicle-catalog-ui`)

Basado en `frontend-components.md` (Functional Design) y `nfr-design/security-design.md`/`performance-design.md`.

## Inventario de componentes lógicos

| Componente                                                            | Failure Domain                                           | Blast Radius                                                                                                                                   | Recursos compartidos                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `SchemaFieldRenderer.tsx` (extendido, bloque `vin_decode` + `select`) | Mismo árbol de render del formulario de vehículo         | Un fallo (ej. error de red en decode de VIN) degrada solo el formulario de crear/editar vehículo — no el resto de la SPA                       | `POST /vehicles/decode-vin` (U1)                             |
| `category-schema-editor.tsx` (extendido)                              | Mismo árbol de render del editor de schema               | Un fallo (ej. `GET /categories/facebook-values/{field_key}` con 404) cae al input manual ya existente — sin romper el resto del editor         | `GET /categories/facebook-values/{field_key}` (U1)           |
| `ProductLocationFields` (nuevo)                                       | Mismo árbol de render de la vista de detalle de producto | Un fallo de guardado deja el formulario en su estado anterior (sin persistir un override parcial) — no afecta el resto de la vista de producto | Endpoints de producto ya existentes (sin cambio de contrato) |

## Aislamiento de componentes

Los 3 componentes viven dentro del mismo bundle de Next.js ya desplegado (`apps/web`) — sin aislamiento de proceso propio (no aplica a un frontend SPA/SSR). El aislamiento real es a nivel de componente React: un error en uno no debería propagarse a los otros gracias al árbol de componentes ya existente (cada uno en su propia pantalla/ruta).

## Puente hacia Infrastructure Design

Sin infraestructura nueva que aprovisionar — Infrastructure Design debe confirmar que no hace falta ningún recurso nuevo (mismo build/deploy de Next.js ya vigente).
