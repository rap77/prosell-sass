# Deuda técnica: acoplamiento residual a "vehículo" post-Subsystem A

> **Estado:** documentado, pendiente de PR dedicado (futuro cercano).
> **Origen:** surgido durante el review de PR #34 (Subsystem A — generic ProductCard).
> **Roadmap:** parte del [Product Platform Generalization](2026-06-06-product-platform-roadmap.md) (6 subsistemas). Esto es el _cleanup residual de Subsystem A_, con solapes hacia B (filtros) y E (RBAC).
> **Verificado contra código:** 2026-06-17 (las `file:line` pueden moverse; re-verificar antes de ejecutar).

## 1. Por qué existe esta deuda

ProSell nació como catálogo **de vehículos**. La generalización a una **plataforma multi-vertical category-driven** (Vehicles, Real Estate, Retail desde una cuenta) se hace por subsistemas, uno a la vez. Subsystem A entregó el `ProductCard` genérico (la **grilla** ya no depende de `Vehicle`), pero dejó intencionalmente vivo el acoplamiento que NO bloqueaba el slice de presentación. Esa es la deuda a cerrar.

## 2. Distinción crítica — NO todo "vehicle" es deuda

Antes de tocar nada, hay que separar dos cosas que parecen iguales pero no lo son:

| Tipo                       | Qué es                                                                                                                        | Qué hacer                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Acoplamiento ILEGÍTIMO** | Código GENÉRICO disfrazado de "vehículo" (una grilla, un row, un command palette, el core del bulk-upload). El nombre miente. | **Generalizar / renombrar.**                                           |
| **Especificidad LEGÍTIMA** | Features que SON inherentemente de autos (VIN, NHTSA decode, make/model/trim). Un VIN no existe para una casa.                | **NO borrar — aislar** como _vertical plugin_ (`verticals/vehicles/`). |

Confundir las dos lleva a dos errores opuestos: dejar el leak genérico (deuda eterna) o borrar features reales del vertical Vehicles (regresión). El PR dedicado debe respetar esta línea.

## 3. Inventario del acoplamiento (verificado 2026-06-17)

### 3.1 Frontend — acoplamiento ILEGÍTIMO (generalizar)

| #   | Punto                                             | Ubicación                                                                                                                                  | Detalle                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Tipo `Vehicle` que en realidad es un `ProductRow` | `apps/web/src/components/datagrid/DataGrid.tsx:61`                                                                                         | `interface Vehicle { id, title, price, status, photo_url, year?, make?, model?, branch_* }`. Los campos `year/make/model` son opcionales y vehicle-specific; el resto es 100% genérico. Es un row de catálogo mal nombrado.                                                   |
| F2  | `CommandPalette` tipado a `Vehicle[]`             | `apps/web/src/components/layout/CommandPalette.tsx:15,18`                                                                                  | Importa `Vehicle` de DataGrid; prop `vehicles?: Vehicle[]`. Renderizado por `Header.tsx` y `catalog/page.tsx`.                                                                                                                                                                |
| F3  | Tabla del catálogo aún via wrapper legacy         | `apps/web/src/app/(seller)/catalog/page.tsx:358`                                                                                           | `const vehicles = products.map(transformProductToVehicle)` — la **grilla** ya usa `ProductCard` (viewModels genéricos), pero la **tabla** (`DataGrid`) sigue consumiendo el shape `Vehicle`.                                                                                  |
| F4  | Wrappers deprecados aún vivos                     | `transformProductToVehicle` (`apps/web/src/lib/api/products.ts:495`), `isVehicleProduct` (`apps/web/src/types/product.ts:184`)             | Mantenidos como puente. **Su borrado total depende de Subsystem C** (auto-categoría en create) para eliminar el código vertical-specific del write path en un cambio coherente.                                                                                               |
| F5  | `BulkUploadCSV` core acoplado                     | `apps/web/src/components/upload/BulkUploadCSV.tsx`                                                                                         | `CSVRecord` con `vin/make/model/trim/...`; `useBulkUploadProducts` importado de `@/lib/api/vehicles`; archivo `vehicle_upload_template.csv:211`. El mecanismo (parse → preview → upload) es genérico; el **schema de columnas** debería venir de `category.attribute_schema`. |
| F6  | `ProductForm` con schema vehicle-fijo             | `apps/web/src/components/forms/ProductForm.tsx:70-77` (`year/make/model/trim/drivetrain` en el Zod), sección "VIN & Identificación" `:752` | Form estático de campos de auto. Generalización real = form dinámico por `attribute_schema` del vertical.                                                                                                                                                                     |

### 3.2 Frontend — especificidad LEGÍTIMA (aislar, no borrar)

| Punto              | Ubicación                                                          | Nota                                                                                                  |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| VIN decode / NHTSA | `apps/web/src/lib/api/vehicles.ts` (`decodeVin`, `DecodedVehicle`) | Inherente al vertical Vehicles. Debe vivir como feature del _vehicle plugin_, no en el core genérico. |

### 3.3 Backend

| Punto                              | Ubicación                                                         | Tipo      | Nota                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Permission.VEHICLE_*`             | `apps/api/src/prosell/domain/entities/role.py:45-48`              | Ilegítimo | `VEHICLE_CREATE/READ/UPDATE/DELETE` → `LISTING_*`. **Ya previsto en Subsystem E (RBAC).**                                                                  |
| `vehicle_router`                   | `apps/api/.../routers/vehicle_router.py`                          | Mixto     | `GET ""` (list genérico → candidato a `product_router`) + `POST /decode-vin` (legítimo, vehicle plugin).                                                   |
| `csv_field_mapper`                 | `apps/api/.../domain/services/csv_field_mapper.py`                | Ilegítimo | Parser CSV vehicle-shaped (`body_style`, etc.). Fuente de verdad de las columnas → la generalización de F5 depende de alinear esto con `attribute_schema`. |
| `AssignmentStrategy.VEHICLE_OWNER` | `apps/api/.../domain/services/lead_assignment_rules_engine.py:32` | Naming    | Conceptualmente "product owner". Rename de bajo impacto.                                                                                                   |

## 4. Approaches de solución (con tradeoffs)

### Opción 1 — Cleanup quirúrgico de naming + tabla genérica _(recomendado para el PR dedicado)_

- **Qué:** renombrar `Vehicle` → `ProductRow` (o `CatalogRow`) en DataGrid + DataGridRow + DataGridSkeleton + CommandPalette + catalog. Alimentar `DataGrid` directo desde el viewModel genérico, **eliminando `transformProductToVehicle` del render de la tabla** (F1, F2, F3). Rename `VEHICLE_OWNER` (3.3) si entra barato.
- **Tradeoff:** ✅ bajo riesgo (rename + reconexión de tipos, sin cambio de comportamiento), cierra el ~60% más visible del leak. ❌ no toca form ni bulk-upload (siguen vehicle-shaped, pero son contenibles).
- **Depende de:** nada. Se puede hacer ya.

### Opción 2 — Form + bulk-upload dinámicos por `attribute_schema`

- **Qué:** `ProductForm` y `BulkUploadCSV` renderizan/validan campos desde `category.attribute_schema` del vertical (F5, F6). CSV mapper backend (3.3) generalizado.
- **Tradeoff:** ✅ generalización real. ❌ **alto riesgo y esfuerzo**; toca write path, validación, parser backend. Requiere el contrato de Subsystem B (filtros/campos dinámicos) maduro.
- **Depende de:** Foundation (✅ hecho) + Subsystem B. **NO meter en el cleanup PR** — es su propio subsistema.

### Opción 3 — Aislamiento de vertical plugin

- **Qué:** mover VIN/NHTSA/make-model a `verticals/vehicles/` explícito (3.2). Clarifica la frontera legítima.
- **Tradeoff:** ✅ ordena la arquitectura, hace el resto del cleanup obvio. ❌ refactor de movimiento de archivos; valor sobre todo estructural.
- **Depende de:** idealmente después de Opción 1.

### Permission rename (`VEHICLE_*` → `LISTING_*`)

- Pertenece a **Subsystem E** (RBAC + onboarding). Tocar `role.py` arrastra seeds, migraciones de roles y guards. **No mezclar** con el cleanup de presentación.

## 5. Scope recomendado del PR dedicado

> **PR: "Subsystem A residual cleanup — degeneralize the catalog table"**
> Alcance = **Opción 1** únicamente. Bajo riesgo, alto valor, sin dependencias.
>
> - Renombrar `Vehicle` → `ProductRow` en DataGrid/CommandPalette/catalog (F1, F2).
> - Tabla alimentada por viewModel genérico; quitar `transformProductToVehicle` del render (F3).
> - (Opcional barato) rename `AssignmentStrategy.VEHICLE_OWNER`.
>
> **Fuera de scope (cada uno su propio cambio):**
>
> - F4 (borrar wrappers) → tras Subsystem C.
> - F5/F6 + CSV mapper (form/bulk-upload dinámicos) → Opción 2, tras Subsystem B.
> - `Permission.VEHICLE_*` → Subsystem E.
> - VIN/NHTSA isolation → Opción 3.

Esta partición respeta la regla de scope del proyecto: el cleanup PR cierra solo lo barato/bajo-riesgo/sin-dependencias; lo grande y lo dependiente se quedan en sus subsistemas.

## 6. Definition of Done del PR dedicado (Opción 1)

- [ ] `Vehicle` ya no aparece como nombre de tipo en `datagrid/` ni `CommandPalette` (renombrado a `ProductRow`).
- [ ] `catalog/page.tsx` no llama `transformProductToVehicle` para la tabla.
- [ ] `transformProductToVehicle` queda solo donde F4 lo requiera (o se marca su pendiente a Subsystem C).
- [ ] Tests de DataGrid/CommandPalette actualizados al nuevo tipo.
- [ ] typecheck 0, lint 0, GGA passed, suite verde.
