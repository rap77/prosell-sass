# Story Map — Export de catálogo

Cada historia de `stories.md` mapeada a su(s) Unit(s) implementador(es).

## Story → Unit Mapping

| Story ID | Título                                                   | Unit(s)                                                         | Directory                                        | Cross-cutting |
| -------- | -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ | ------------- |
| US1.1    | Exportar catálogo en formato cliente                     | U1 (genera CSV+ZIP) + U2 (dispara descarga)                     | `u1-catalog-export-api` / `u2-catalog-export-ui` | Sí            |
| US1.2    | Nombre sugerido para el archivo descargado               | U2 (100% client-side, sin componente backend)                   | `u2-catalog-export-ui`                           | No            |
| US1.3    | Aviso cuando el catálogo excede el límite de exportación | U1 (enforcement + error específico) + U2 (renderiza el mensaje) | `u1-catalog-export-api` / `u2-catalog-export-ui` | Sí            |

## Cross-cutting Stories (detalle)

### US1.1 — Exportar catálogo en formato cliente

- **U1** entrega: filtrado `published`/tenant-scoped, serialización a las
  24 columnas exactas, armado del ZIP con carpetas por vehículo
  sanitizadas (AC1.1.2, AC1.1.3, AC1.1.4, AC1.1.7, AC1.1.9, AC1.1.11).
- **U2** entrega: acción de UI, descarga del ZIP combinado, guard de
  doble-clic, estados de carga/éxito (AC1.1.1, AC1.1.6 parcial — el log
  de imagen faltante lo emite U1, U2 solo recibe el resultado exitoso
  igual, AC1.1.10).

### US1.3 — Aviso cuando el catálogo excede el límite de exportación

- **U1** entrega: el enforcement real del cap (NFR3) y el error
  específico que dispara cuando se excede (AC1.3.1, número exacto
  diferido a NFR Design — AC1.3.2).
- **U2** entrega: el mensaje de error claro renderizado al usuario a
  partir de la respuesta tipada de U1 (AC1.3.1).

## Implementation Order Within Units

- **U1**: una sola historia primaria (US1.1) más el enforcement de US1.3
  — sin orden interno relevante, ambos forman parte del mismo endpoint.
- **U2**: US1.2 (diálogo de nombre) es un prerequisito de UX antes de
  disparar la descarga de US1.1 en el mismo flujo — orden natural dentro
  del componente, no una dependencia entre Units.

## Coverage Verification

- **Toda historia asignada**: US1.1 ✅ (U1+U2), US1.2 ✅ (U2), US1.3 ✅
  (U1+U2) — 3/3.
- **Todo Unit tiene historias**: U1 tiene US1.1 y US1.3; U2 tiene US1.1,
  US1.2 y US1.3 — ningún Unit queda sin historia.
