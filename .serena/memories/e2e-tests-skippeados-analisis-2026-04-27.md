# E2E Tests Skippeados - Análisis (2026-04-27)

## Resumen Ejecutivo

**Archivo**: `tests/e2e/specs/catalog-search-filters.spec.ts`

**Total tests skippeados**: 7 tests

**Categoría**: Tests skippeados por falta de implementación de features

---

## Detalle de Tests Skippeados

### 1. Year Range Slider (1 test)

**Test**: `should filter by year range` (línea 103-125)

**Razón**: `test.skip(true, "Year range slider not found in UI")`

**Feature faltante**:
- Componente **Year Range Slider** en la UI del catálogo
- El test espera un slider con `role="slider"` para filtrar por rango de años

**Referencia**:
```typescript
// Línea 121-123
// TODO: Implement Year Range Slider component in catalog UI
// GitHub Issue: https://github.com/prosell-sass/prosell-sass/issues/XXX
```

**Impacto**: No se puede filtrar vehículos por rango de años desde la UI

---

### 2. Catalog Search Input (2 tests)

**Tests**:
- `should search vehicles by text` (línea 149-178)
- `should escape XSS in search query` (línea 409-444)

**Razón**: `test.skip(true, "Search input connected to URL not found in catalog UI - feature may not be implemented yet")`

**Feature faltante**:
- Input de búsqueda en el área **main** del catálogo (no el placeholder del header)
- Debe estar conectado a **URL state** para permitir queries compartibles
- Placeholder esperado: `/search|buscar/i`

**Referencia**:
```typescript
// Línea 157-158
// TODO: Implement catalog search input connected to URL query params
// GitHub Issue: https://github.com/prosell-sass/prosell-sass/issues/XXX
```

**Impacto**:
- No se puede buscar vehículos por texto
- No se comparten URLs de búsqueda
- Vulnerabilidad XSS no verificada en búsqueda

---

### 3. CommandPalette (4 tests)

**Tests**:
- `should open CommandPalette and show search input when Cmd+K is pressed` (línea 180-215)
- `should filter vehicles in CommandPalette` (línea 217-259)
- `should navigate to vehicle from CommandPalette` (línea 261-298)

**Razones**:
- `test.skip(true, "CommandPalette feature not yet implemented")`
- `test.skip(true, "CommandPalette not available")`
- `test.skip(true, "No options in CommandPalette")`

**Feature faltante**:
- Componente **CommandPalette** con:
  - `cmdk` + Radix Dialog
  - Activación con **Cmd+K** (o Ctrl+K)
  - Búsqueda fuzzy de vehículos
  - Navegación rápida a vehicle details
  - Acciones: "Publish vehicle...", "Create new vehicle"

**Referencia**:
```typescript
// Línea 193-194
// TODO: Implement CommandPalette component with cmdk + Radix Dialog
// GitHub Issue: https://github.com/prosell-sass/prosell-sass/issues/XXX
```

**Impacto**:
- Sin búsqueda rápida fuzzy
- Sin shortcuts de teclado para power users
- Sin navegación rápida desde cualquier parte de la app

---

## Estado por Feature

| Feature | Tests Skippeados | Prioridad | Complejidad |
|---------|------------------|-----------|-------------|
| Year Range Slider | 1 | Media | Baja |
| Catalog Search Input | 2 | Alta | Media |
| CommandPalette | 4 | Alta | Alta |

---

## Recomendaciones

### 1. Prioridad Inmediata: Catalog Search Input

**Por qué**:
- Feature core de UX para catálogos
- 2 tests cubren funcionalidad + XSS security
- Relativamente simple de implementar

**Implementación**:
- Agregar input de búsqueda en `<main>` del catálogo
- Conectar a URL params con `useSearchParams`
- Validar XSS escaping

---

### 2. Prioridad Media: Year Range Slider

**Por qué**:
- Feature útil pero no critical
- Ya existe filtro de año por URL params
- Solo falta UI

**Implementación**:
- Reusar componente de slider existente
- Conectar a `minYear`/`maxYear` params
- 1 test para validar

---

### 3. Prioridad Alta (UX): CommandPalette

**Por qué**:
- Power user feature
- 4 tests bloqueados
- Mejora significativa de UX

**Complejidad**:
- Requiere `cmdk` + Radix Dialog integration
- Fuzzy search logic
- Keyboard navigation
- Múltiples action groups

---

## Próximos Pasos

1. **Crear GitHub Issues** para cada feature faltante
2. **Estimar esfuerzo** de implementación
3. **Priorizar** según roadmap de producto
4. **Implementar features** y unskip tests
5. **Validar** que los tests pasen

---

## Notas Técnicas

- Los tests usan **mocking de API** con `mockVehiclesEndpoint` y `mockCategoriesEndpoint`
- Tests usan `test.skip()` **condicional** basado en visibilidad de elementos
- No son bugs de testing — son **features no implementadas**
- El diseño de tests es **correcto**: detectan falta de features

---

**Fecha**: 2026-04-27
**Archivo Analizado**: `tests/e2e/specs/catalog-search-filters.spec.ts`
**Tests Totales en Archivo**: 20 tests (7 condicionalmente skippeados)
