# Configuración de Presentación por Vertical

El `ProductCard` es **100% dinámico** — lee su configuración desde `CategoryPresentation` y se adapta automáticamente a cada vertical (vehículos, inmuebles, genéricos, etc.).

## Arquitectura

```typescript
interface CategoryPresentation {
  card_fields?: CardField[]; // Qué campos mostrar en la grilla (max 4)
  subtitle_template?: string; // Template para el subtítulo
  filter_fields?: FilterField[]; // Qué filtros exponer en sidebar
}

interface CardField {
  key: string; // Nombre del atributo (ej: "year", "bedrooms")
  source: string; // De dónde leerlo (ej: "attributes.year")
}
```

## Ejemplos por Vertical

### 🚗 Vehículos

```json
{
  "subtitle_template": "{year} {make} {model}",
  "card_fields": [
    { "key": "year", "source": "attributes.year" },
    { "key": "mileage", "source": "attributes.mileage" },
    { "key": "fuel_type", "source": "attributes.fuel_type" },
    { "key": "transmission", "source": "attributes.transmission" }
  ],
  "filter_fields": [
    { "key": "year", "filter_type": "range" },
    { "key": "make", "filter_type": "select" },
    { "key": "fuel_type", "filter_type": "select" },
    { "key": "transmission", "filter_type": "select" }
  ]
}
```

**Resultado:**

- **Subtítulo**: "2020 Toyota Camry"
- **Grilla**: Año | Kilometraje | Combustible | Transmisión
- **Filtros**: Rango de año, Selección de marca/combustible/transmisión

---

### 🏠 Inmuebles

```json
{
  "subtitle_template": "{property_type} en {location_city}",
  "card_fields": [
    { "key": "bedrooms", "source": "attributes.bedrooms" },
    { "key": "bathrooms", "source": "attributes.bathrooms" },
    { "key": "area_m2", "source": "attributes.area_m2" },
    { "key": "property_type", "source": "attributes.property_type" }
  ],
  "filter_fields": [
    { "key": "bedrooms", "filter_type": "range" },
    { "key": "bathrooms", "filter_type": "range" },
    { "key": "area_m2", "filter_type": "range" },
    { "key": "property_type", "filter_type": "select" }
  ]
}
```

**Resultado:**

- **Subtítulo**: "Casa en Buenos Aires"
- **Grilla**: Habitaciones | Baños | Superficie | Tipo
- **Filtros**: Rangos de hab/baños/m², Tipo de propiedad

---

### 📦 Genéricos (ej: Electrónica)

```json
{
  "subtitle_template": "{brand} - {condition}",
  "card_fields": [
    { "key": "brand", "source": "attributes.brand" },
    { "key": "condition", "source": "attributes.condition" },
    { "key": "warranty_months", "source": "attributes.warranty_months" },
    { "key": "stock", "source": "attributes.stock" }
  ],
  "filter_fields": [
    { "key": "brand", "filter_type": "select" },
    { "key": "condition", "filter_type": "select" },
    { "key": "warranty_months", "filter_type": "range" }
  ]
}
```

**Resultado:**

- **Subtítulo**: "Samsung - Nuevo"
- **Grilla**: Marca | Estado | Garantía | Stock
- **Filtros**: Marca, Estado, Rango de garantía

---

## Cómo se Configura

### Opción 1: Desde el Backend (DB)

```sql
-- En la tabla categories
UPDATE categories
SET presentation = '{
  "card_fields": [
    {"key": "bedrooms", "source": "attributes.bedrooms"},
    {"key": "bathrooms", "source": "attributes.bathrooms"}
  ],
  "subtitle_template": "{property_type} en {location_city}"
}'
WHERE slug = 'real-estate';
```

### Opción 2: Desde el Admin UI (futuro)

En la sección de **Administración de Categorías**:

1. Ir a "Verticales"
2. Seleccionar vertical (ej: "Inmuebles")
3. Configurar:
   - **Campos de tarjeta**: arrastrar y soltar atributos (max 4)
   - **Template de subtítulo**: texto con placeholders `{attr}`
   - **Filtros**: elegir qué atributos filtrar y su tipo

### Opción 3: Desde el Seed (desarrollo)

```python
# apps/api/src/prosell/infrastructure/persistence/seed.py

real_estate_presentation = {
    "card_fields": [
        {"key": "bedrooms", "source": "attributes.bedrooms"},
        {"key": "bathrooms", "source": "attributes.bathrooms"},
        {"key": "area_m2", "source": "attributes.area_m2"},
        {"key": "property_type", "source": "attributes.property_type"}
    ],
    "subtitle_template": "{property_type} en {location_city}",
    "filter_fields": [
        {"key": "bedrooms", "filter_type": "range"},
        {"key": "bathrooms", "filter_type": "range"},
        {"key": "area_m2", "filter_type": "range"},
        {"key": "property_type", "filter_type": "select"}
    ]
}

session.add(Category(
    name="Real Estate",
    slug="real-estate",
    presentation=real_estate_presentation,
    attribute_schema={...}
))
```

---

## Jerarquía de Herencia

```
Vertical (root)
  └─ presentation: {...}  ← Si una categoría hija no tiene presentation,
                             hereda de aquí
  └─ Category (hija)
       └─ presentation: {...}  ← Si tiene, override; si no, hereda del padre
```

**Ejemplo:**

```
Vehicles (vertical)
  └─ presentation: { card_fields: [year, make, model, mileage] }
  └─ Cars
       └─ presentation: null  ← Hereda de "Vehicles"
  └─ Motorcycles
       └─ presentation: { card_fields: [year, make, engine_cc, type] }  ← Override
```

---

## Validación de Campos

El `ProductCard` es **defensivo**:

1. **Campo faltante** → se saltea (no crashea)
2. **Sin presentation** → renderiza solo título + precio
3. **Más de 4 card_fields** → toma los primeros 4
4. **Template con placeholder inexistente** → renderiza vacío ese slot

```typescript
// Ejemplo interno: formatCardField()
const metaCells = (presentation?.card_fields ?? [])
  .slice(0, 4) // Max 4
  .map((field) => formatCardField(field, productAttributes[field.key], schema))
  .filter((cell) => cell.value !== null); // Saltea valores faltantes
```

---

## Testing

Para testear diferentes configuraciones SIN tocar la DB:

```typescript
// En el mock data (apps/web/src/lib/mocks/products.ts)
const MOCK_PRESENTATION: CategoryPresentation = {
  card_fields: [
    { key: "bedrooms", source: "attributes.bedrooms" },
    { key: "bathrooms", source: "attributes.bathrooms" }
  ],
  subtitle_template: "{property_type} en {location_city}"
};

// En el catálogo:
<ProductCard
  product={mockProduct}
  presentation={MOCK_PRESENTATION}  // Override para testing
  {...}
/>
```

---

## Roadmap de Mejoras

- [ ] **UI de configuración** en Admin (drag & drop de card_fields)
- [ ] **Preview en vivo** al editar presentation
- [ ] **Templates avanzados** (condicionales, formateo custom)
- [ ] **Slots adicionales** (ribbon, footer, tags)
- [ ] **Presentación por device** (mobile vs desktop)

---

## Referencias

- **Spec completo**: `docs/superpools/specs/2026-06-09-subsystem-a-productcard-design.md`
- **Tipos TypeScript**: `apps/web/src/types/category.ts`
- **Componente**: `apps/web/src/components/catalog/ProductCard.tsx`
- **Utilidades**: `apps/web/src/lib/utils/composeSubtitle.ts`, `formatCardField.ts`
