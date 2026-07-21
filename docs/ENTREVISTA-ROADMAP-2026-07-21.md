# 🎯 ENTREVISTA ESTRATÉGICA — Roadmap v4.0 Definitivo

**Fecha**: 21 Julio 2026
**Participantes**: Product Owner + Tech Lead
**Objetivo**: Clarificar prioridades y timeline para roadmap v4.0 final

---

## 📊 CONTEXTO RESUMIDO

Tenemos **4 iniciativas** en el aire:

| Iniciativa               | Source                    | Status                | Prioridad Sugerida   |
| ------------------------ | ------------------------- | --------------------- | -------------------- |
| **Facebook Automation**  | Roadmap v3.0/v4.0         | 30% done              | 🔴 P0 (crítico)      |
| **CRM Ligero (5 Fases)** | .planning/ + Engram #2924 | Planeado, no iniciado | 🟡 P1 (importante)   |
| **Tenant Cascade**       | PROP-001                  | Under review          | 🟡 P1 (arquitectura) |
| **Product Enrichment**   | PROP-002                  | Backlog               | 🟢 P2 (nice-to-have) |

---

## 🔴 SECCIÓN 1: ESTRATEGIA DE NEGOCIO

### Q1.1: ¿ProSell es Marketplace o CRM?

**Contexto**: Roadmap v3.0 dice "Marketplace-First", pero plan 5 Fases apunta a CRM.

**Opciones**:

- **A)** Marketplace puro (dealers publican, nosotros NO tocamos leads)
- **B)** Marketplace + CRM ligero (publicar + gestionar leads generados)
- **C)** CRM completo (competir con Twenty CRM, enfoque total en gestión)

**Tu respuesta**: ________

**Implicaciones**:

- Opción A → Facebook Automation es TODO, CRM descartado
- Opción B → Facebook Automation + CRM features que potencian marketplace
- Opción C → CRM prioridad, marketplace secundario

---

### Q1.2: ¿Cuál es el VALOR ÚNICO que ProSell ofrece?

**Contexto**: Definir esto guía qué features priorizar.

**Opciones** (marca todas las que apliquen):

- [ ] **Automatización publicación** (dealers publican 10x más rápido)
- [ ] **Pricing intelligence** (dealers saben a qué precio vender)
- [ ] **Lead management** (dealers no pierden clientes)
- [ ] **Multi-marketplace** (un solo lugar para publicar en FB/ML/OLX)
- [ ] **Analytics IA** (insights sobre qué se vende)
- [ ] **CRM workflow automation** (automatizar seguimiento leads)
- [ ] Otro: ____________________

**Implicaciones**:

- Las features que NO apoyan el valor único van a backlog.

---

### Q1.3: ¿Cuándo necesitás revenue?

**Contexto**: Esto define si Wallet/Monetización es urgente.

**Opciones**:

- **A)** URGENTE (necesitamos $ este trimestre)
- **B)** Importante (Q4 2026 ok)
- **C)** No crítico (validar adoption primero, $ después)

**Tu respuesta**: ________

**Implicaciones**:

- Opción A → Wallet entra en roadmap como P0
- Opción B → Wallet entra después de automation
- Opción C → Wallet backlog indefinido

---

### Q1.4: ¿Cuál es el bottleneck de crecimiento HOY?

**Contexto**: Identificar qué nos impide crecer 10x.

**Opciones**:

- **A)** Publicación manual (dealers no escalan)
- **B)** Pricing (dealers no saben qué precio poner)
- **C)** Lead leakage (dealers pierden clientes)
- **D)** Onboarding (dificil convencer dealers nuevos)
- **E)** Otro: ____________________

**Tu respuesta**: ________

**Implicaciones**:

- La feature que resuelve el bottleneck es P0.

---

## 🟡 SECCIÓN 2: PRIORIZACIÓN FEATURES

### Q2.1: Facebook Automation — ¿Qué tan crítico es?

**Contexto**: Roadmap v4.0 dice P0 (3 meses, $2.8K).

**Opciones**:

- **A)** CRÍTICO — sin esto el negocio muere (arrancamos YA)
- **B)** Importante — podemos esperar 1-2 meses más
- **C)** Revisable — quizás hay algo más urgente

**Tu respuesta**: ________

Si elegiste A o B:

- **¿Cuánto tiempo tenés antes de que se vuelva bloqueante?**: ______ semanas
- **¿Cuántos dealers están esperando esto HOY?**: ______ dealers

---

### Q2.2: CRM Ligero (Kanban, Timeline, WhatsApp) — ¿Lo querés?

**Contexto**: Plan 5 Fases propone features CRM.

**Features propuestas**:

| Feature               | Esfuerzo | Valor para Dealer          |
| --------------------- | -------- | -------------------------- |
| Kanban view leads     | 3 días   | Visual pipeline management |
| WhatsApp share button | 1 día    | Viralidad productos        |
| Timeline actividades  | 3 días   | Tracking follow-up         |
| Auto-assignment leads | 2 días   | Round-robin dealers        |

**Pregunta**: ¿Cuáles de estas features SÍ querés?

**Tu selección** (marca las que apliquen):

- [ ] Kanban view
- [ ] WhatsApp share button
- [ ] Timeline actividades mejorada
- [ ] Auto-assignment leads
- [ ] Ninguna (CRM no es prioridad)

**Timeline preferido**:

- **A)** Noviembre 2026 (post-automation)
- **B)** Diciembre 2026 (Q4 final)
- **C)** Q1 2027 (no urgente)
- **D)** Backlog indefinido

**Tu respuesta**: ________

---

### Q2.3: Tenant Cascade (PROP-001) — ¿Es bloqueante?

**Contexto**: Fix arquitectural multi-tenant. P1, under review.

**Problema**: Hoy hay 2 formas de indicar "quién es el dueño del producto" → bugs.

**Pregunta**: ¿Esto está causando bugs CRÍTICOS hoy?

**Opciones**:

- **A)** SÍ, hay bugs en producción (arreglarlo YA)
- **B)** No hay bugs críticos, pero arquitectura es frágil (arreglarlo pronto)
- **C)** No urgente (backlog)

**Tu respuesta**: ________

**Esfuerzo estimado**: 2-3 días (backend + frontend + migration)

---

### Q2.4: Product Enrichment (PROP-002) — ¿Es MVP?

**Contexto**: Completar datos de vehículos post-VIN decode (specs, consumo, etc).

**Problema**: Fichas de producto incompletas.

**Pregunta**: ¿Dealers se quejan de esto HOY?

**Opciones**:

- **A)** SÍ, es un pain point grande (hacerlo)
- **B)** Nice-to-have, no crítico (backlog)
- **C)** No lo necesitamos (descartar)

**Tu respuesta**: ________

**Esfuerzo estimado**: 2-3 días MVP / 1-2 semanas completo

---

## 🟢 SECCIÓN 3: RECURSOS & CONSTRAINTS

### Q3.1: ¿Cuántas horas/semana tenés para desarrollo?

**Contexto**: Dimensionar roadmap realista.

**Tu respuesta**: ______ horas/semana

**Breakdown** (opcional):

- Backend: ______ horas
- Frontend: ______ horas
- DevOps: ______ horas

---

### Q3.2: ¿Tenés budget para servicios externos?

**Contexto**: AI, infra, monitoring cuestan $.

**Servicios**:

| Servicio        | Costo Mensual | Necesario Para          |
| --------------- | ------------- | ----------------------- |
| Redis + workers | $150-200      | Task queue (automation) |
| OpenAI API      | $50-100       | AI titles (automation)  |
| Sentry APM      | $50           | Monitoring (production) |
| **TOTAL**       | **~$300/mes** | Automation + monitoring |

**Pregunta**: ¿Está ok gastar $300/mes en infra?

**Opciones**:

- **A)** SÍ, aprobado
- **B)** Sí, pero buscar alternativas más baratas
- **C)** NO, buscar solo opciones gratis

**Tu respuesta**: ________

---

### Q3.3: ¿Cuándo es el "hard deadline" del launch?

**Contexto**: ¿Hay fecha inamovible para lanzar?

**Opciones**:

- **A)** Octubre 31, 2026 (hard deadline)
- **B)** Noviembre/Diciembre ok (flexible)
- **C)** No hay deadline (trabajamos a ritmo sostenible)

**Tu respuesta**: ________

**Implicación**:

- Deadline hard → recortar features para cumplir
- Deadline flexible → hacer bien vs rápido

---

## 🎯 SECCIÓN 4: DECISIONES BINARIAS

### Q4.1: Wallet — ¿SÍ o NO para MVP?

**Contexto**: Prepago/tokens vs freemium unlimited.

**Opción A**: CON Wallet (pay-per-publish desde día 1)

- ✅ Revenue inmediato
- ❌ +2 semanas desarrollo
- ❌ Fricción onboarding

**Opción B**: SIN Wallet (freemium unlimited, monetizar después)

- ✅ Faster to market
- ✅ Sin fricción adoption
- ❌ No revenue stream

**Tu decisión**: ________

---

### Q4.2: Scraping/Analytics — ¿SÍ o NO para MVP?

**Contexto**: Pricing intelligence via scraping competitors.

**Opción A**: SÍ (incluir en MVP)

- ✅ Diferenciador único
- ❌ +3-4 semanas desarrollo
- ❌ Alto mantenimiento (scrapers se rompen)

**Opción B**: NO (post-MVP)

- ✅ MVP más rápido
- ❌ No hay pricing intelligence al launch

**Tu decisión**: ________

---

### Q4.3: Branches vacías — ¿Eliminar o mantener?

**Contexto**: 5 branches (`feat/phase-*`) están vacías, 150+ commits detrás.

**Opción A**: Eliminar (cleanup repo)

- ✅ Repo limpio
- ❌ Pierde referencia histórica

**Opción B**: Mantener como `archive/phase-*`

- ✅ Preserva historia
- ❌ Clutter en branch list

**Opción C**: Eliminar + documentar en .planning/

- ✅ Limpio + documentado
- ✅ Planning persiste

**Tu decisión**: ________

---

## 📋 RESUMEN DE DECISIONES

(Completar después de responder):

| Decisión                | Tu Respuesta | Impacto en Roadmap |
| ----------------------- | ------------ | ------------------ |
| ProSell es...           | _______      | _______            |
| Valor único             | _______      | _______            |
| Revenue urgency         | _______      | _______            |
| Bottleneck hoy          | _______      | _______            |
| FB Automation prioridad | _______      | _______            |
| CRM features            | _______      | _______            |
| Tenant Cascade          | _______      | _______            |
| Product Enrichment      | _______      | _______            |
| Horas disponibles       | _______      | _______            |
| Budget infra            | _______      | _______            |
| Hard deadline           | _______      | _______            |
| Wallet MVP              | _______      | _______            |
| Scraping MVP            | _______      | _______            |
| Branches vacías         | _______      | _______            |

---

**NEXT STEP**: Con estas respuestas, generaré el **Roadmap v4.0 DEFINITIVO**.
