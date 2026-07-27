# Spec — Eliminar el 3er nivel (L3) del vertical de Transporte

## Contexto

El vertical `Vehículos y Transporte` está sembrado en `seed_categories.py` con 3 niveles:

```
L0:  Vehículos y Transporte (root vertical)
L1:  Vehículos Terrestres | Acuáticos | Aéreos | Recreacionales
L2:  Carros y Camionetas | Motos | Barcos | Aviones | Casas Rodantes | Remolques
L3:  Sedán | SUV | Hatchback | Coupé | Pick-up | etc. (nodos hoja con attribute_schema)
```

El usuario reporta que **la selección en niveles profundos no se setea en el campo correspondiente** (ej. elegir "Sedán" en el selector de categorías y que el form no muestre `mileage`, `engine_cc` o el atributo específico del nodo hoja). Hipótesis actual: el form recibe el nodo seleccionado pero su `attribute_schema` puede estar vacío o heredando de un ancestro.

Independientemente del bug, el L3 resulta **funcionalmente inútil para el vertical de Transporte**: los L3 comparten schema casi idéntico y solo varían los `options` de un par de selects. Eliminar L3 de Transporte:

- Reduce la fricción del selector de categorías (3 clicks → 2 clicks).
- Cierra el bug de cascada porque queda **una** spec por L2.
- Obliga a consolidar el `attribute_schema` por L2 (algunos L3 hermanos tienen schemas distintos hoy).

Este spec cubre **también** la corrección del bug de cascada (L3 elegible, schema vacío). El bug se considera dentro del alcance porque sin él el colapso a L2 generaría muchos productos sin spec.

## Estado actual

- `seed_categories.py`: árbol completo con L0-L3, los L3 son `_leaf(...)` con `attribute_schema`.
- `organization_vertical`: M2M con `root_category_id` (solo almacena raíces L0).
- `Category.level`: columna entera, soporta N niveles (no hay hardcode a 3).
- `Product.category_id`: FK a `categories.id`. La mayoría apunta al L3 hoy.
- URL pública `/p/[slug]`: el `slug` se resuelve desde el nodo seleccionado (L3). Si eliminamos L3, hay que definir qué slug queda.
- `UnifiedProductForm` (`SchemaFieldRenderer.tsx`) lee `category.attribute_schema` del nodo recibido en props; si ese nodo no tiene spec, el form queda vacío.
- `migrations/versions/`: no hay migración previa que colapse L3.

## Historia

> Como owner de producto, quiero que el selector de categorías de Vehículos sea de **2 niveles** (raíz → categoría) con un único `attribute_schema` por categoría, para que la selección siempre tenga schema útil y el form se cargue con los atributos correctos.

## Sub-decisiones confirmadas

| Sub-decisión                                | Decisión                                                |
| ------------------------------------------- | ------------------------------------------------------- |
| **SD1 — Consolidación de schemas L3 → L2**  | (b) Unión de keys                                       |
| **SD2 — Migración de productos existentes** | (a) Reasignar `category_id` automáticamente vía Alembic |
| **SD3 — Slug de URL pública**               | (b) Tabla `category_slug_redirect` con 307              |
| **SD4 — Selector de categorías**            | (a) 2 niveles, L1 directo                               |

Implicancias para el contrato y los tests:

- La unión de keys se calcula con la **semántica de Bash-style dedup**: si dos L3 hermanos definen la misma key, gana la versión más restrictiva (la que tenga `required=true` o el mayor `validation_rules`). Si empatan, gana el primero en orden lexicográfico (determinístico).
- La migración Alembic **siempre** corre en transacción; cualquier error aborta el cambio y deja el estado anterior.
- La tabla `category_slug_redirect` se crea en la misma migración y se popula con un mapeo (slug_viejo, category_id_nuevo). El middleware de FastAPI (`products_router.py`) checa esta tabla antes de hacer lookup por slug.
- `CategorySelectorModal` se actualiza para mostrar 2 niveles (L0 + L1 directo), ocultando el L3 que ya no existe en el árbol.

## Alcance (MVP, sujeto a las SDs elegidas)

1. **Refactor del seed**: el vertical `Vehículos y Transporte` pasa de 3 niveles a 2.
2. **Consolidación del schema**: las keys de cada L2 son la unión (o selección manual) de los L3 hermanos.
3. **Migración de datos**: scripts SQL/Alembic que mueven productos existentes al L2 correspondiente.
4. **Bug fix de cascada**: verificar que `category.attribute_schema` está poblado en todos los L2 resultantes (no ya en L3 que vamos a borrar).
5. **URLs públicas**: según SD3; preserva los enlaces o redirige.
6. **Tests** de cobertura con TDD-first (orden abajo).

Fuera de alcance:

- Eliminar L3 en Bienes Raíces o Artículos (otro PR por vertical; misma metodología).
- Cambiar el modelo de jerarquía a "tags" planos.
- UI nueva para elegir schema por sub-vertical (eso es parte del spec A).

## Diseño TDD-first

### Tests primero (en este orden; cada uno debe fallar antes del fix)

#### Backend (`apps/api/tests/integration/api/test_category_l3_collapse.py`)

- **API1 — Cascade bug**: dado un producto con `category_id` apuntando al L3 más profundo, cuando GET en `/products/{id}`, los `attributes` deben contener todas las keys del `attribute_schema` de ese L3. Si falla, hay bug de cascada.
- **API2 — Coverage**: itera sobre `seed_categories.VEHICLES_VERTICAL` y verifica que cada L3 hoja tiene `attribute_schema` no vacío (con al menos `make`, `model`, `year`). Si falla, estás sembrando hojas vacías.
- **API3 — Migration**: corre `alembic upgrade head` con datos semilla, verifica que `select count(*) from products where category_id in (l3_ids) = 0` y `select count(*) = (total original)` apuntando al L2.
- **API4 — URL**: tras la migración, `GET /p/{slug_viejo}` devuelve 307/308 al nuevo slug (depende de SD3) o 200 con el producto.
- **API5 — Round-trip**: tras la migración, `GET /categories?recursive=true` devuelve el árbol sin L3 y `attribute_schema` poblado en cada L2.

#### Frontend (`apps/web/tests/unit/components/category-selector.test.tsx` y `unified-product-form.test.tsx`)

- **FE1 — Loading**: cuando el usuario selecciona un L2 nuevo, `UnifiedProductForm` recibe el `attribute_schema` y renderiza los inputs correspondientes.
- **FE2 — Cascade today**: cuando el usuario selecciona un L3 actual y el form se monta, todos los campos del schema del L3 se renderizan. (Test de regresión: si esto ya falla, hay bug de cascada previo al spec B; registrarlo y arreglar como parte del alcance.)

### Pasos de implementación (post-spec)

1. Spec firmado (este doc).
2. Crear rama feature y tests rojos.
3. Confirmar bug de cascada (FE2 y/o API1). Si falla: arreglar primero (debería ser fix de 1-2 líneas, posiblemente en `SchemaFieldRenderer` o en la lectura del nodo). Volver a correr tests.
4. Refactorizar `seed_categories.py` para bajar a L2.
5. Crear migración Alembic `2026xxxx_collapse_transport_l3.py` con:
   - Pasos `upgrade()`: detectar L3 actuales, snapshot, mover productos, eliminar L3.
   - Pasos `downgrade()`: rollback (restaurar L3, reasignar productos al L3 original desde la tabla snapshot).
6. Actualizar DTOs para reflejar el árbol.
7. Implementar decisión SD3 (URL mapping).
8. Tests verdes.
9. Typecheck, lint, Ruff, GGA, pre-commit.
10. Migrar staging primero, smoke test, después prod (vía `promote-prod.yml` con `confirm=deploy`).

## Riesgos y mitigaciones

| Riesgo                                                      | Mitigación                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Productos existentes en estado inconsistente tras migración | Snapshot pre-migración; tests con datos reales; rollback documentado               |
| URLs públicas rotas y baja de SEO                           | Tabla `category_slug_redirect` con 307 (decisión SD3)                              |
| Pérdida de datos en `attributes` no schema (libres)         | `JSONB merge` en downgrade; nunca `DROP COLUMN`                                    |
| Diferencias entre schema de L3 hermanos                     | SD1: definir contrato (unión vs selección manual) ANTES de tocar seed              |
| Otros verticales afectados accidentalmente                  | Scope del PR = solo `VEHICLES_VERTICAL`; Bienes Raíces y Artículos quedan intactos |
| Doctores locales con datos de otros tenants                 | Test suite con setUp que usa una sola organización y limpia después                |

## Métricas de éxito

- Bug de cascada resuelto (FE2 ✅).
- 5 tests backend + 2 tests frontend verde.
- Suite completa igual o mejor que antes (sin regresiones).
- GGA, pyright, ESLint, Ruff: 0 errores.
- Smoke test manual en staging: crear producto en L2 "Carros y Camionetas" y verificar que el form carga los atributos.
- Una vez prod: cero errores 5xx en `/api/v1/products` durante 24h.

## No hacer (estos quedan como issues separados, no en este spec)

- Eliminar L3 en Bienes Raíces (mismo patrón, otro PR).
- Eliminar L3 en Artículos (idem).
- UI para elegir schema por sub-vertical (spec A).
- Eliminar nodos intermedios en nivel "old marketplace" (`.com_published` columna legacy).

## Orden de implementación final

1. Spec firmado (este doc) ✅.
2. Tests rojos (FE2, API1, API2).
3. Fix bug de cascada (si aplica).
4. Tests rojos (API3, API4, API5, FE1).
5. Refactor `seed_categories.py`.
6. Migración Alembic con snapshot.
7. Tabla `category_slug_redirect` (SD3).
8. Tests verdes.
9. Verificación (typecheck, lint, GGA, pre-commit, CI).
10. Commit con conventional commit: `feat(catalog): collapse vehicle vertical to 2 levels`.
11. PR + review.
12. Staging manual + smoke test.
13. Prod (`promote-prod.yml` con `confirm=deploy`).
