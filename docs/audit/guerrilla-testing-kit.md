# Guerrilla Testing Kit — Sidebar Terminology

**Objective**: Validate "Inventario/Ventas/Configuración" vs alternatives with real sellers

**Target**: 3-5 sellers (current dealers or prospects)

**Time**: 15-20 min per seller

---

## Script

### Intro (2 min)

"Estamos diseñando el nuevo panel de ProSell y queremos validar qué términos te resultan más naturales. Esto NO es una demo, es solo 5 preguntas rápidas."

### Question 1: Card Sorting (3 min)

**Cards**: "Autos", "Vehículos", "Inventario", "Catálogo", "Publicaciones", "Ventas", "Leads", "Citas", "Configuración", "Perfil"

**Instruction**: "Agrupa estas palabras en 3 categorías que para ti tengan sentido: **Gestión de autos**, **Ventas**, **Configuración**."

**Expected**:

- If they group "Autos/Vehículos/Inventario" together → terminology matches
- If they reject "Inventario" → note their preference

### Question 2: Natural Language (2 min)

"Cuando decís 'tengo que cargar los autos al sistema', ¿qué palabra usarías para describir esa acción?"

- [ ] "Cargar inventario"
- [ ] "Subir autos"
- [ ] "Cargar vehículos"
- [ ] "Publicar autos"
- [ ] Otro: \***\*\_\_\_\*\***

### Question 3: Navigation (3 min)

Show mock (use paper or Figma):

```
┌─────────────────────────────────┐
│  [Logo]  ProSell   [User]       │
├─────────────────────────────────┤
│  ► Inventario       (24)        │
│  ► Ventas                       │
│    ├─ Publicaciones             │
│    ├─ Leads                     │
│    ├─ Citas                    │
│  ► Configuración                │
└─────────────────────────────────┘
```

**Ask**: "Si tuviste que publicar un auto nuevo en Facebook, ¿en qué sección harías clic?"

- [ ] Inventario ✅ (expected)
- [ ] Ventas
- [ ] Configuración
- [ ] No sé / confuso

### Question 4: Alternative Terms (2 min)

"¿Cuál de estas opciones te parece más clara?"

| Option A      | Option B           |
| ------------- | ------------------ |
| Inventario    | Autos / Vehículos  |
| Ventas        | Operaciones        |
| Configuración | Ajustes / Settings |

### Question 5: Mental Model (3 min)

"Describí cómo organizás tu trabajo hoy, desde que tenés un auto nuevo hasta que se vende."

**Listen for**:

- ¿Usan la palabra "inventario" espontáneamente?
- ¿Hablan de "cargar", "publicar", "subir"?
- ¿Mencionan "leads" o "interesados"?

---

## Decision Matrix

| Seller | Prefiere "Inventario"? | Prefiere "Autos"? | Confundido? | Notes |
| ------ | ---------------------- | ----------------- | ----------- | ----- |
| 1      |                        |                   |             |       |
| 2      |                        |                   |             |       |
| 3      |                        |                   |             |       |
| 4      |                        |                   |             |       |
| 5      |                        |                   |             |       |

**Go/No-Go Decision**:

- If ≥4/5 prefer "Inventario" → **GO** (proceed with current terminology)
- If ≥3/5 prefer "Autos/Vehículos" → **CHANGE** to "Autos"
- If ≥2 confused → **REDESIGN** sidebar

---

## Risk Assessment

### Current Risk: MEDIUM

**Why**:

- "Inventario" is standard B2B terminology (used by dealers daily)
- But some sellers may prefer more colloquial "Autos"

**Mitigation**:

- If testing reveals preference for "Autos", Route Groups refactoring is ~2h work
- Zustand stores use `inventoryStore` (internal), UI text is decoupled

**Fallback**:

- Phase 8 can use "Autos" in UI while keeping `inventoryStore` internally
- No breaking changes to architecture

---

## Timeline

| Day     | Action                           |
| ------- | -------------------------------- |
| Today   | Prepare script + recruit sellers |
| Day 1-2 | Conduct 3-5 interviews           |
| Day 3   | Analyze results + decision       |
| Day 4   | Implement if change needed       |

**Total**: 3-4 days (but only ~2-3 hours of active work)
