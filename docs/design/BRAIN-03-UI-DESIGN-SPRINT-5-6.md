# 🎨 Diseño UI/UX - Sprint 5-6 (Carga de Inventarios)
**Fuente:** MasterMind Framework - Cerebro #3 (UI Design)
**Fecha:** 2026-03-04
**NotebookLM ID:** 8d544475-6860-4cd7-9037-8549325493dd

---

## 📋 CONTEXTO

- **Proyecto:** ProSell SaaS - B2B para concesionarias de autos
- **Objetivo Sprint 5-6:** Reemplazar carga manual (WhatsApp → Empleado → Facebook) con plataforma web
- **Uso:** Dealers cargan 20-40 autos/día → DEBE SER RÁPIDO
- **Stack:** Next.js 16, React 19, Tailwind CSS 4, Zustand, shadcn/ui, Magic UI

---

## 1. ESTRUCTURA DEL FORMULARIO

### ¿Multi-paso o Single-page?

**Recomendación:** Flujo HÍBRIDO con "Smart Focus"

**Desktop:**
- Página única dividida en secciones claras (Organismos)
- Dealer ve todo de un vistazo

**Móvil:**
- Acordeón o scroll por secciones
- "Sticky Actions" (botón de publicar siempre visible al final)

### Clave: VIN Decoder primero

```
1. Dealer ingresa VIN
2. Sistema valida automáticamente
3. Marca, Modelo, Año se auto-pueblan
4. Dealer solo completa Precio + Fotos
```

**Beneficio:** Reduce campos, elimina errores, ahorra tiempo

---

## 2. COMPONENTES RECOMENDADOS

### Formulario de Carga

| Componente | Librería | Uso |
|------------|---------|-----|
| **Input + Button** | shadcn/ui | Campo VIN con botón "Decodificar" |
| **Card** | shadcn/ui | Agrupar campos (Datos, Precio, Multimedia) |
| **Retro Grid / Animated List** | Magic UI | Área de carga de fotos con progreso visual |
| **Progress** | shadcn/ui | Barra de progreso real para upload de 20 fotos |

### Dashboard (Listado)

| Componente | Librería | Uso |
|------------|---------|-----|
| **Data Table** | shadcn/ui | Vista de lista con filtros rápidos |
| **Bento Grid** | Magic UI | Vista de cards de autos (desktop) |
| **Tabs** | shadcn/ui | Alternar estados (Publicado, Vendido, Borrador) |

---

## 3. SISTEMA DE DISEÑO

### Paleta de Colores (Regla 60-30-10)

```css
/* Neutrales (60%) - Fondo, texto */
--neutral-900: #121212  /* Fondo dark mode (evita smearing OLED) */
--neutral-800: #1e1e1e
--neutral-700: #2d2d2d
--neutral-200: #e5e5e5
--neutral-100: #f5f5f5  /* Fondo light mode */

/* Primario (10%) - Brand */
--primary: #6366f1  /* Índigo profesional */
--primary-hover: #4f46e5
--primary-light: #818cf8

/* Semánticos */
--success: #22c55e  /* Verde - Vendido */
--error: #ef4444    /* Rojo - Errores VIN */
--warning: #f59e0b  /* Ámbar - Borrador */
```

**IMPORTANTE:** Nunca usar color primario para estados de error

### Tipografía

```css
/* Fuente */
font-family: 'Inter' | 'Geist', sans-serif;

/* Escala */
--text-base: 16px  /* Mínimo para móvil (evita zoom iOS) */
--text-small: 14px  /* Etiquetas */
--text-large: 18px  /* Títulos */
--text-display: 24px; /* Headers */
```

### Spacing

**Escala de 8px fija**
```css
/* Múltiplos de 8 */
--spacing-1: 8px;
--spacing-2: 16px;
--spacing-3: 24px;
--spacing-4: 32px;
--spacing-5: 40px;
```

**No inventar medidas** - usar siempre múltiplos de 8

---

## 4. FLUJO DE USUARIO ÓPTIMO

```
┌─────────────────────────────────────────────────────────────┐
│                    PANTALLA: CARGAR PRODUCTO                │
└─────────────────────────────────────────────────────────────┘

1. [VIN] ──────────────────┐
   │ Autofocus            │ ↓ Validación Inline
   │ type="text"          │ ↓ (onBlur)
   └──────────────────────┘ ↓
2. [Decodificar] → Auto-puebla Marca, Modelo, Año
3. [Precio] ────────────────┐
   │ type="number"        │ ↓ Validación Inline
   └──────────────────────┘ ↓
4. [Fotos] ─────────────────┐
   │ Drag & Drop masivo   │ ↓ Progreso visual
   │ (hasta 20)           │ ↓ Reordenamiento
   └──────────────────────┘ ↓
5. [Preview Facebook] ──────┐ "Cómo se verá"
   └────────────────────────┘ ↓
6. [PUBLICAR] ──────────────┐ Loading state
   └────────────────────────┘ ↓ Evita doble clic
```

---

## 5. PATRONES PARA ERRORES Y VALIDACIÓN

### Regla de Oro: No depender SOLO del color

```tsx
// ❌ MAL - Solo color
<Input className="border-red-500" />

// ✅ BIEN - Color + Icono + Mensaje
<div className="flex items-center gap-2">
  <Input className="border-red-500" />
  <AlertCircle className="text-red-500" />
  <span className="text-sm">VIN no encontrado</span>
</div>
```

### Accesibilidad

| Patrón | Implementación |
|--------|----------------|
| **Foco visible** | `:focus-visible` con anillo prominente |
| **Zonas de toque** | Mínimo 44x44px en móvil (incluso si ícono es menor) |
| **Inputs nativos** | `type="number"` para precio, `type="text"` para VIN |

---

## 6. DISEÑO RESPONSIVE PARA MÓVIL

### Thumb Zone (Zona del pulgar)

```
┌─────────────────────────────┐
│        (Sin usar)           │ ← Zona difícil
├─────────────────────────────┤
│        Contenido            │ ← Zona cómoda
├─────────────────────────────┤
│  [Guardar]  [PUBLICAR]      │ ← Zona natural del pulgar
└─────────────────────────────┘
```

### Grid Fluido (Móvil)

- **4 columnas** con márgenes de 16-20px
- Dar "respiro" al contenido
- No amontonar elementos

---

## 7. COMPONENTES ESPECÍFICOS A IMPLEMENTAR

### VIN Input con Decoder

```tsx
<div className="flex gap-2">
  <Input
    placeholder="Ingresa VIN (17 caracteres)"
    className="flex-1"
    autoFocus
    onBlur={validateVin}
  />
  <Button onClick={decodeVin}>
    <Search className="mr-2 h-4 w-4" />
    Decodificar
  </Button>
</div>
```

### Upload de Fotos con Progreso

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {photos.map((photo, index) => (
    <Card key={index} className="relative">
      <img src={photo.url} alt={`Foto ${index + 1}`} />
      {photo.uploading && (
        <Progress value={photo.progress} className="absolute bottom-0" />
      )}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => removePhoto(index)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  ))}
  <Card
    className="flex items-center justify-center h-32 border-dashed"
    onClick={selectPhotos}
  >
    <Upload className="h-8 w-8 text-muted-foreground" />
  </Card>
</div>
```

### Preview de Publicación Facebook

```tsx
<Card className="p-4 bg-muted">
  <h3 className="font-semibold mb-2">Vista previa (Facebook)</h3>
  <div className="flex gap-4">
    <img src={primaryPhoto} alt="Preview" className="w-24 h-24 object-cover" />
    <div>
      <p className="font-medium">{title || "Título del auto"}</p>
      <p className="text-2xl font-bold">{price || "$0"}</p>
      <p className="text-sm text-muted-foreground">
        {year} {make} {model}
      </p>
    </div>
  </div>
</Card>
```

---

## 8. ESTRUCTURA DE PANTALLAS

### Pantalla 1: Formulario de Carga

```
┌─────────────────────────────────────────────────────────────┐
│  CARGAR PRODUCTO                           [Cancelar] [Borrador] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📗 DATOS BÁSICOS                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │ VIN        [________________] [Decodificar]         │     │
│  │ Marca      [Honda] (auto)                          │     │
│  │ Modelo     [Civic] (auto)                          │     │
│  │ Año        [2023] (auto)                           │     │
│  │ Precio     [$_____]                                │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  📷 FOTOS (0/20)                                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │                                                      │     │
│  │           [Arrastra fotos aquí]                    │     │
│  │                                                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  👁️ VISTA PREVIA                                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ [Preview Facebook]                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│                    [GUARDAR BORRADOR]  [PUBLICAR]             │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla 2: Listado de Productos

```
┌─────────────────────────────────────────────────────────────┐
│  MIS PRODUCTOS                        [+ Nuevo] [Filtros]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Todos] [Publicado] [Vendido] [Borrador]                   │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                         │
│  │Auto1│ │Auto2│ │Auto3│ │Auto4│ ...                       │
│  │$15k │ │$22k │ │$18k │ │$12k │                           │
│  │👁️45 │ │👁️23 │ │👁️67 │ │👁️12 │                           │
│  └─────┘ └─────┘ └─────┘ └─────┘                         │
│                                                              │
│  Ver más (1-20 de 156)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. NEXT STEPS

1. ✅ **Cerebro #3 (UI Design)** - Diseño general (COMPLETADO)
2. ⏳ **Cerebro #4 (Frontend)** - Patrones de implementación Next.js 16
3. ⏳ **Magic UI** - Componentes específicos (forms, dashboards)
4. ⏳ **shadcn/ui** - Setup del sistema de diseño

---

## 10. DESIGN TOKENS (Para implementar)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Primario
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
        },
        // Semánticos
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
      },
      spacing: {
        '18': '4.5rem', // Múltiplos de 8 personalizados
      },
    },
  },
}
```

---

**Estado:** ✅ COMPLETADO
**Siguiente paso:** Consultar Cerebro #4 (Frontend) para patrones de implementación

---

*Generado por MasterMind Framework v1.0 - Cerebro #3 (UI Design)*
