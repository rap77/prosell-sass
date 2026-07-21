# 📊 ANÁLISIS: Plan 5 Fases CRM (Abandonado)

**Fecha Análisis**: 21 Julio 2026
**Fecha Original**: 11 Julio 2026
**Status**: Branches creadas pero nunca desarrolladas

---

## 🔍 CONTEXTO ORIGINAL (11 Julio 2026)

### El Plan: ProSell CRM en 5 Fases

**Inspiración**: Twenty CRM (open source CRM moderno)
**Objetivo**: Evolucionar de marketplace a CRM completo
**Timeline**: No definido (planeado post-MVP)

### Las 5 Fases Planeadas

| Fase  | Feature                             | Precio  | Concepto Twenty | Status Actual         |
| ----- | ----------------------------------- | ------- | --------------- | --------------------- |
| **1** | MVP WhatsApp: /p/[slug] + compartir | GRATIS  | Ninguno         | ⚠️ PARCIALMENTE HECHO |
| **2** | Lead Capture: "Me interesa" + notif | GRATIS  | Ninguno         | ✅ YA EXISTE          |
| **3** | CRM básico: tabla + kanban          | $29/mes | Views           | ❌ NO INICIADO        |
| **4** | Pipelines: timeline + actividades   | $49/mes | Pipelines       | ⚠️ PARCIALMENTE HECHO |
| **5** | Workflows: notificaciones auto      | $99/mes | Automations     | ❌ NO INICIADO        |

---

## 📋 ESTADO DE LAS BRANCHES

### Análisis Git

```bash
feat/phase-1-mvp-whatsapp: +0 ahead, -150 behind main
feat/phase-2-lead-capture: +0 ahead, -165 behind main
feat/phase-3-crm-basic:    +0 ahead, -165 behind main
feat/phase-4-pipelines:    +0 ahead, -165 behind main
feat/phase-5-workflows:    +0 ahead, -165 behind main
```

**Veredicto**: Branches son **PLANNING ARTIFACTS** (nunca desarrolladas, muy detrás de main)

---

## ✅ LO QUE YA EXISTE EN MAIN (Sin saberlo)

### Fase 1: MVP WhatsApp — ✅ **PARCIALMENTE HECHO**

**Planeado**:

- Backend: GET /api/v1/public/products/{slug} ✅ EXISTE
- Frontend: Layout público + página /p/[slug] ✅ EXISTE
- SEO: Open Graph meta tags ⚠️ FALTA
- UX: Botón "Compartir por WhatsApp" sticky ❌ FALTA

**Status**: ~50% hecho (producto público funcional, falta botón WhatsApp)

---

### Fase 2: Lead Capture — ✅ **YA EXISTE COMPLETO**

**Planeado**:

- Botón "Me interesa" en producto público
- Lead creation
- Notificaciones dealer

**Status**: 100% hecho — Sistema de leads completo en main

- ✅ Lead router completo (`lead_router.py`)
- ✅ Lead management UI (`vendedor/leads`, `manager/team/leads`)
- ✅ Lead assignment + notifications
- ✅ Facebook leads integration base

**CONCLUSIÓN**: Esta fase YA NO ES NECESARIA

---

### Fase 3: CRM Básico (tabla + kanban) — ⚠️ **PARCIALMENTE HECHO**

**Planeado**:

- Vista tabla de leads
- Vista kanban

**Status**: ~40% hecho

- ✅ Tabla leads existe (`TeamLeadList.tsx`)
- ❌ Vista kanban NO existe
- ✅ CRUD básico funcional

**Gap**: Falta vista kanban drag-and-drop

---

### Fase 4: Pipelines — ⚠️ **PARCIALMENTE HECHO**

**Planeado**:

- Timeline de actividades
- Estado pipeline lead

**Status**: ~30% hecho

- ✅ Pipeline page existe (`/pipeline`)
- ✅ Lead status workflow
- ⚠️ Timeline básica
- ❌ Actividades/notas NO robustas

**Gap**: Timeline completa + actividades estructuradas

---

### Fase 5: Workflows (Automations) — ❌ **NO INICIADO**

**Planeado**:

- Auto-asignación leads
- Notificaciones automáticas basadas en triggers
- Reminders automáticos

**Status**: 0% hecho

- ❌ No hay workflow engine
- ❌ No hay triggers configurables
- ⚠️ Notifications básicas existen pero no automáticas por trigger

**Gap**: TODO

---

## 🎯 EVALUACIÓN: ¿ES RELEVANTE HOY?

### ❓ **PREGUNTA CRÍTICA**: ¿ProSell es Marketplace o CRM?

**Roadmap v3.0/v4.0 dice**: **Marketplace-First** (Facebook automation crítica)

**Plan 5 Fases decía**: **CRM-First** (evolucionar a Twenty CRM competitor)

**CONFLICTO**: Los dos roadmaps apuntan a direcciones diferentes.

---

### 💡 **PROPUESTA**: Fusión Pragmática

**No es "Marketplace XOR CRM"** → Es **"Marketplace CON CRM ligero"**

#### Estrategia Híbrida

1. **Core (Prioridad 1)**: Facebook Marketplace Automation
   - Roadmap v4.0 Sprint A-B-C completo
   - Esto es **NON-NEGOTIABLE**

2. **CRM Ligero (Prioridad 2)**: Features que POTENCIAN el marketplace
   - Kanban view (Fase 3) → ayuda a dealers gestionar leads de FB
   - Timeline actividades (Fase 4) → tracking follow-up post-publicación
   - WhatsApp share button (Fase 1) → viralidad productos

3. **CRM Avanzado (Prioridad 3)**: Post-MVP, evaluar demand
   - Workflows/Automations (Fase 5)
   - Solo si dealers LO PIDEN activamente

---

## 📅 INTEGRACIÓN PROPUESTA AL ROADMAP v4.0

### Sprint D (Nov 2026) — CRM Ligero Post-Launch

**Objetivo**: Agregar features CRM que potencien marketplace automation

| Tarea                                  | Estimación | Justificación                           |
| -------------------------------------- | ---------- | --------------------------------------- |
| **Kanban view** para leads             | 3 días     | Visual management post-captura FB leads |
| **WhatsApp share button** en /p/[slug] | 1 día      | Viralidad productos (dealers lo usan)   |
| **Timeline actividades** mejorada      | 3 días     | Tracking follow-up estructurado         |
| **Lead auto-assignment** básico        | 2 días     | Round-robin dealers en org              |
| **SEO meta tags** Open Graph           | 1 día      | Sharing preview bonito                  |

**Total**: ~2 semanas (10 días hábiles)

**Acceptance Criteria**:

- [ ] Kanban drag-and-drop funcional
- [ ] WhatsApp share genera link pre-filled
- [ ] Timeline muestra actividades + notas
- [ ] Auto-assignment configurable por org
- [ ] OG tags muestran imagen + info producto

---

### Sprint E (Dic 2026 - Opcional) — CRM Avanzado

**SOLO SI** demand validated post-Sprint D.

| Tarea                             | Estimación | Justificación                             |
| --------------------------------- | ---------- | ----------------------------------------- |
| **Workflow engine** básico        | 5 días     | Triggers: lead created → auto-asignar     |
| **Reminder automations**          | 3 días     | "Seguir lead tras 3 días sin contacto"    |
| **Email notifications** mejoradas | 2 días     | Templates + triggers                      |
| **Activity templates**            | 2 días     | "Llamar", "Email", "WhatsApp" pre-defined |

**Total**: ~2.5 semanas

**Acceptance Criteria**:

- [ ] Workflow: lead created → auto-assign → notify dealer
- [ ] Reminder: lead sin actividad 3 días → alert
- [ ] Email templates configurables
- [ ] Activity quick-add desde kanban

---

## 🚨 DECISIONES PENDIENTES

### 1. **¿Mantener o Eliminar Branches?**

**Opción A**: Eliminar branches (están vacías, 150+ commits detrás)

- ✅ Pro: Limpia el repo
- ❌ Con: Pierde referencia histórica de planning

**Opción B**: Mantener pero renombrar (ej: `archive/phase-*`)

- ✅ Pro: Preserva historia
- ❌ Con: Clutter en git branch list

**Opción C**: Eliminar branches + documentar en .planning/

- ✅ Pro: Limpio + documentado
- ✅ Pro: Planning persiste en .planning/ROADMAP-5-PHASES-20260711.md

**RECOMENDACIÓN**: **Opción C**

---

### 2. **¿CRM Ligero es MVP o Nice-to-Have?**

**Opción A**: CRM Ligero es MVP (Sprint D obligatorio)

- ✅ Pro: Diferenciador vs competencia
- ❌ Con: Retrasa otros features

**Opción B**: CRM Ligero es Nice-to-Have (Sprint D opcional)

- ✅ Pro: Foco en automation primero
- ✅ Pro: Solo ejecutar si hay demand
- ❌ Con: Puede perder oportunidad market

**RECOMENDACIÓN**: **Opción B** (evaluar demand post-Sprint C)

---

### 3. **¿Pricing del CRM?**

**Plan original**:

- Fase 3: $29/mes
- Fase 4: $49/mes
- Fase 5: $99/mes

**Realidad**:

- Ya tenemos features de Fase 2-4 parcialmente
- No tiene sentido cobrar por "tabla" (ya existe)

**Propuesta nueva**:

- **Tier Free**: Marketplace + Lead Management básico (tabla)
- **Tier Pro ($49/mes)**: Marketplace + Kanban + Timeline + Auto-assignment
- **Tier Enterprise ($99/mes)**: Todo + Workflows/Automations

**DECISIÓN PENDIENTE**: Validar pricing con product/business

---

## 📝 PLAN DE ACCIÓN INMEDIATO

### Corto Plazo (Esta Semana)

1. ✅ **Documentar análisis** (este archivo)
2. ⏳ **Decision call con stakeholders**:
   - ¿Mantener/eliminar branches?
   - ¿CRM Ligero es MVP o Nice-to-Have?
   - ¿Cuándo ejecutar (Nov? Dic? 2027?)?
3. ⏳ **Actualizar roadmap v4.0** si Sprint D aprobado

### Medio Plazo (Próximo Mes)

4. ⏳ **Sprint A-B-C** (Automation) → **PRIORIDAD 1**
5. ⏳ **Evaluar demand CRM** post-Sprint C
6. ⏳ **Planificar Sprint D** si demand confirmed

### Largo Plazo (Q4 2026)

7. ⏳ **Sprint D** (CRM Ligero) si aprobado
8. ⏳ **Sprint E** (CRM Avanzado) si demand validated

---

## ✅ CONCLUSIÓN

### Lo Que Aprendimos

1. **Planificación existe** — Engram #2924 + .planning/ tienen el plan completo
2. **Branches están vacías** — Solo planning artifacts, nunca desarrolladas
3. **Algunas features YA EXISTEN** — Fase 2 completa, Fases 1/3/4 parciales
4. **Hay conflicto estratégico** — Roadmap v3.0 (Marketplace) vs 5 Fases (CRM)

### Recomendación Final

**FUSIONAR ambos roadmaps** en un enfoque híbrido:

1. **Sprint A-B-C (Ago-Oct)**: Facebook Automation ← **Roadmap v4.0**
2. **Sprint D (Nov)**: CRM Ligero ← **5 Fases (parcial)**
3. **Sprint E (Dic)**: CRM Avanzado (opcional) ← **5 Fases (opcional)**

**Eliminar branches vacías** + **preservar planning** en `.planning/`

**Siguiente paso**: Review con product → Aprobar Sprint D inclusion en roadmap v4.0

---

**CHANGELOG**:

- 2026-07-21: Análisis creado post-auditoría branches + engram
- Integración propuesta a roadmap v4.0
